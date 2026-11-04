import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { evaluateToken, generateToken, hashToken, TOKEN_TTL_MS } from "@/lib/auth/tokens";

const now = new Date("2026-11-04T12:00:00Z");
const inFuture = new Date(now.getTime() + 1000);

describe("génération et hachage des tokens", () => {
  it("génère des tokens aléatoires de 256 bits en base64url", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateToken));
    expect(tokens.size).toBe(100);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("stocke une empreinte SHA-256, jamais le token en clair", () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(hash).not.toBe(token);
    expect(hash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hashToken(token)).toBe(hash);
  });

  it("expire après 24 h (validation) et 1 h (réinitialisation)", () => {
    expect(TOKEN_TTL_MS.verify_email).toBe(24 * 3600 * 1000);
    expect(TOKEN_TTL_MS.reset_password).toBe(3600 * 1000);
  });
});

describe("evaluateToken", () => {
  const record = { type: "verify_email" as const, expiresAt: inFuture, usedAt: null };

  it("accepte un token non utilisé et non expiré", () => {
    expect(evaluateToken(record, "verify_email", now)).toBe("valid");
  });

  it("rejette un token expiré, y compris à l'instant exact d'expiration", () => {
    expect(evaluateToken({ ...record, expiresAt: new Date(now.getTime() - 1) }, "verify_email", now)).toBe("expired");
    expect(evaluateToken({ ...record, expiresAt: now }, "verify_email", now)).toBe("expired");
  });

  it("rejette un token déjà utilisé (usage unique)", () => {
    expect(evaluateToken({ ...record, usedAt: now }, "verify_email", now)).toBe("used");
  });

  it("signale « déjà utilisé » avant « expiré »", () => {
    expect(
      evaluateToken({ ...record, usedAt: now, expiresAt: new Date(0) }, "verify_email", now),
    ).toBe("used");
  });

  it("rejette un token inconnu ou d'un autre type", () => {
    expect(evaluateToken(null, "verify_email", now)).toBe("invalid");
    expect(evaluateToken(record, "reset_password", now)).toBe("invalid");
  });
});
