import { createHash, randomBytes } from "node:crypto";
import type { EmailTokenType, PrismaClient } from "@/generated/prisma/client";

// Client Prisma ou transaction interactive.
type Db = Pick<PrismaClient, "emailToken">;

export const TOKEN_TTL_MS: Record<EmailTokenType, number> = {
  verify_email: 24 * 60 * 60 * 1000, // 24 h
  reset_password: 60 * 60 * 1000, // 1 h
};

/** Token en clair envoyé par email : 32 octets aléatoires (CSPRNG), en base64url. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Seule l'empreinte SHA-256 est stockée. Le token ayant 256 bits d'entropie,
 * un hash rapide sans sel suffit et permet la recherche par index unique.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type TokenState = "valid" | "invalid" | "expired" | "used";

type TokenRecord = { type: EmailTokenType; expiresAt: Date; usedAt: Date | null };

/** Règles d'acceptation d'un token, sans accès à la base. */
export function evaluateToken(
  record: TokenRecord | null,
  expectedType: EmailTokenType,
  now: Date,
): TokenState {
  if (!record || record.type !== expectedType) return "invalid";
  if (record.usedAt) return "used";
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

/**
 * Crée un token et invalide les précédents du même type encore inutilisés :
 * seul le dernier lien envoyé fonctionne.
 */
export async function issueToken(
  db: Db,
  userId: string,
  type: EmailTokenType,
  now: Date = new Date(),
): Promise<string> {
  await db.emailToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: now },
  });
  const token = generateToken();
  await db.emailToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[type]),
      createdAt: now,
    },
  });
  return token;
}

export type ConsumeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: Exclude<TokenState, "valid"> };

/**
 * Consomme un token (usage unique). Le marquage `used_at` est conditionnel
 * (`used_at IS NULL AND expires_at > now`) : deux requêtes simultanées ne
 * peuvent pas consommer le même token.
 */
export async function consumeToken(
  db: Db,
  token: string,
  type: EmailTokenType,
  now: Date = new Date(),
): Promise<ConsumeResult> {
  const tokenHash = hashToken(token);
  const record = await db.emailToken.findUnique({ where: { tokenHash } });
  const state = evaluateToken(record, type, now);
  if (state !== "valid" || !record) {
    return { ok: false, reason: state === "valid" ? "invalid" : state };
  }

  const { count } = await db.emailToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (count !== 1) return { ok: false, reason: "used" };
  return { ok: true, userId: record.userId };
}
