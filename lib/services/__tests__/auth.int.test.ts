import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailMessage } from "@/lib/email";
import { hashToken } from "@/lib/auth/tokens";
import { createTestClient, resetDatabase } from "@/tests/test-db";

// Emails capturés au lieu d'être envoyés.
const sent = vi.hoisted(() => [] as EmailMessage[]);
vi.mock("@/lib/email", () => ({
  sendEmail: async (m: EmailMessage) => {
    sent.push(m);
  },
}));

// Session simulée pour les guards.
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string } } }));
vi.mock("@/auth", () => ({ auth: async () => session.current }));

const {
  authenticate,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  USERNAME_TAKEN,
  verifyEmail,
} = await import("@/lib/services/auth");
const { requireVerifiedUser } = await import("@/lib/auth/guards");

const db = createTestClient();

const input = {
  username: "Alice",
  firstName: "Alice",
  lastName: "Martin",
  email: "Alice@Example.test",
  password: "motdepasse",
};

function lastToken(path: "verifier-email" | "reinitialiser"): string {
  const message = sent.at(-1);
  const match = message?.text.match(new RegExp(`/${path}/([A-Za-z0-9_-]+)`));
  if (!match) throw new Error(`Aucun lien /${path}/ dans le dernier email.`);
  return match[1];
}

async function registered(now = new Date()) {
  expect(await registerUser(input, now)).toEqual({ ok: true });
  const user = await db.user.findUniqueOrThrow({ where: { email: "alice@example.test" } });
  return { user, token: lastToken("verifier-email") };
}

const later = (from: Date, ms: number) => new Date(from.getTime() + ms);

beforeEach(async () => {
  await resetDatabase(db);
  sent.length = 0;
  session.current = null;
});

afterAll(async () => {
  await db.$disconnect();
});

describe("inscription", () => {
  it("crée le compte non validé, mot de passe haché, et envoie un lien", async () => {
    const { user, token } = await registered();
    expect(user.username).toBe("alice");
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.passwordHash).not.toContain(input.password);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("alice@example.test");
    // Seule l'empreinte du token est en base.
    const stored = await db.emailToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.tokenHash).toBe(hashToken(token));
    expect(stored.tokenHash).not.toBe(token);
  });

  it("refuse un nom d'utilisateur déjà pris, sans tenir compte de la casse (§11 critère 2)", async () => {
    await registered();
    const result = await registerUser({ ...input, username: "ALICE", email: "autre@example.test" });
    expect(result).toEqual({ ok: false, errors: { username: USERNAME_TAKEN } });
    expect(await db.user.count()).toBe(1);
  });

  it("refuse un mot de passe de moins de 8 caractères (§11 critère 3)", async () => {
    const result = await registerUser({ ...input, password: "1234567" });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.password).toMatch(/8 caractères/);
    expect(await db.user.count()).toBe(0);
  });

  it("ne révèle pas qu'un email est déjà utilisé et prévient son titulaire", async () => {
    await registered();
    sent.length = 0;
    const result = await registerUser({ ...input, username: "bob" });
    expect(result).toEqual({ ok: true });
    expect(await db.user.count()).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toMatch(/déjà un compte/);
  });
});

describe("validation de l'email", () => {
  it("valide l'email avec le lien reçu", async () => {
    const { user, token } = await registered();
    expect(await verifyEmail(token)).toEqual({ ok: true });
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.emailVerifiedAt).not.toBeNull();
  });

  it("rejette un token déjà utilisé", async () => {
    const { token } = await registered();
    await verifyEmail(token);
    expect(await verifyEmail(token)).toEqual({ ok: false, reason: "used" });
  });

  it("ne consomme le token qu'une fois en cas de requêtes simultanées", async () => {
    const { token } = await registered();
    const results = await Promise.all([verifyEmail(token), verifyEmail(token), verifyEmail(token)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("rejette un token expiré et laisse l'email non validé", async () => {
    const now = new Date();
    const { user, token } = await registered(now);
    expect(await verifyEmail(token, later(now, 24 * 3600 * 1000))).toEqual({ ok: false, reason: "expired" });
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.emailVerifiedAt).toBeNull();
  });

  it("rejette un token inconnu ou mal formé", async () => {
    expect(await verifyEmail("x".repeat(43))).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyEmail("court")).toEqual({ ok: false, reason: "invalid" });
  });

  it("n'accepte pas un token de réinitialisation comme token de validation", async () => {
    const { user } = await registered();
    await requestPasswordReset({ email: input.email });
    expect(await verifyEmail(lastToken("reinitialiser"))).toEqual({ ok: false, reason: "invalid" });
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.emailVerifiedAt).toBeNull();
  });
});

describe("renvoi du mail de validation", () => {
  it("limite la fréquence, puis envoie un nouveau lien qui invalide l'ancien", async () => {
    const now = new Date();
    const { user, token: first } = await registered(now);

    const tooSoon = await resendVerificationEmail(user.id, later(now, 10_000));
    expect(tooSoon).toMatchObject({ ok: false, error: "rate_limited", retryAfterSeconds: 50 });

    expect(await resendVerificationEmail(user.id, later(now, 61_000))).toEqual({ ok: true });
    const second = lastToken("verifier-email");
    expect(second).not.toBe(first);

    expect((await verifyEmail(first, later(now, 62_000))).ok).toBe(false);
    expect(await verifyEmail(second, later(now, 62_000))).toEqual({ ok: true });
  });

  it("refuse le renvoi quand l'email est déjà validé", async () => {
    const { user, token } = await registered();
    await verifyEmail(token);
    expect(await resendVerificationEmail(user.id)).toEqual({ ok: false, error: "already_verified" });
  });
});

describe("requireVerifiedUser (§11 critère 1)", () => {
  const redirectTo = (path: string) =>
    expect.objectContaining({ digest: expect.stringContaining(`;${path};`) });

  it("renvoie vers la connexion sans session", async () => {
    await expect(requireVerifiedUser()).rejects.toEqual(redirectTo("/connexion"));
  });

  it("bloque un utilisateur non validé, puis l'accepte dès la validation en base", async () => {
    const { user, token } = await registered();
    session.current = { user: { id: user.id } };
    await expect(requireVerifiedUser()).rejects.toEqual(redirectTo("/verifier-email"));

    // Même session (même JWT) : seule la base a changé.
    await verifyEmail(token);
    await expect(requireVerifiedUser()).resolves.toMatchObject({ id: user.id });
  });

  it("bloque à nouveau si la validation est retirée en base, malgré la session", async () => {
    const { user, token } = await registered();
    await verifyEmail(token);
    session.current = { user: { id: user.id } };
    await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: null } });
    await expect(requireVerifiedUser()).rejects.toEqual(redirectTo("/verifier-email"));
  });

  it("renvoie vers la connexion si le compte de la session n'existe plus", async () => {
    session.current = { user: { id: "00000000-0000-0000-0000-000000000000" } };
    await expect(requireVerifiedUser()).rejects.toEqual(redirectTo("/connexion"));
  });
});

describe("connexion", () => {
  it("accepte le bon mot de passe, refuse un mauvais ou un email inconnu", async () => {
    const { user } = await registered();
    await expect(authenticate({ email: "ALICE@example.test", password: input.password })).resolves.toMatchObject({ id: user.id });
    await expect(authenticate({ email: input.email, password: "mauvais-mdp" })).resolves.toBeNull();
    await expect(authenticate({ email: "inconnu@example.test", password: input.password })).resolves.toBeNull();
  });
});

describe("réinitialisation du mot de passe", () => {
  it("donne la même réponse pour un email inconnu, sans rien envoyer", async () => {
    await registered();
    sent.length = 0;
    expect(await requestPasswordReset({ email: "inconnu@example.test" })).toEqual({ ok: true });
    expect(sent).toHaveLength(0);
    expect(await requestPasswordReset({ email: input.email })).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
  });

  it("change le mot de passe (haché) et rejette ensuite le même lien", async () => {
    const { user } = await registered();
    await requestPasswordReset({ email: input.email });
    const token = lastToken("reinitialiser");

    const nouveau = "nouveau-mdp-123";
    expect(await resetPassword({ token, password: nouveau, confirm: nouveau })).toEqual({ ok: true });

    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.passwordHash).toMatch(/^\$argon2id\$/);
    expect(after.passwordHash).not.toContain(nouveau);
    await expect(authenticate({ email: input.email, password: nouveau })).resolves.not.toBeNull();
    await expect(authenticate({ email: input.email, password: input.password })).resolves.toBeNull();

    expect(await resetPassword({ token, password: "encore-un-autre", confirm: "encore-un-autre" })).toEqual({
      ok: false,
      reason: "used",
    });
  });

  it("rejette un lien expiré sans changer le mot de passe", async () => {
    const now = new Date();
    const { user } = await registered(now);
    await requestPasswordReset({ email: input.email }, now);
    const token = lastToken("reinitialiser");
    const before = await db.user.findUniqueOrThrow({ where: { id: user.id } });

    const result = await resetPassword({ token, password: "nouveau-mdp", confirm: "nouveau-mdp" }, later(now, 3600 * 1000 + 1));
    expect(result).toEqual({ ok: false, reason: "expired" });
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.passwordHash).toBe(before.passwordHash);
  });

  it("refuse un nouveau mot de passe trop court sans consommer le lien", async () => {
    await registered();
    await requestPasswordReset({ email: input.email });
    const token = lastToken("reinitialiser");
    const short = await resetPassword({ token, password: "1234567", confirm: "1234567" });
    expect(short.ok).toBe(false);
    expect(await resetPassword({ token, password: "12345678", confirm: "12345678" })).toEqual({ ok: true });
  });

  it("applique la limite de fréquence en silence", async () => {
    const now = new Date();
    await registered(now);
    sent.length = 0;
    await requestPasswordReset({ email: input.email }, now);
    expect(await requestPasswordReset({ email: input.email }, later(now, 5000))).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
  });
});
