import { decode, encode, type JWT } from "next-auth/jwt";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailMessage } from "@/lib/email";
import { createTestClient, resetDatabase } from "@/tests/test-db";

const sent = vi.hoisted(() => [] as EmailMessage[]);
vi.mock("@/lib/email", () => ({
  sendEmail: async (m: EmailMessage) => {
    sent.push(m);
  },
}));

// Session et cookies simulés pour les guards.
const ctx = vi.hoisted(() => ({
  session: null as null | { user: { id: string }; authTime?: number },
  cookieNames: [] as string[],
}));
vi.mock("@/auth", () => ({ auth: async () => ctx.session }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => ctx.cookieNames.map((name) => ({ name, value: "x" })) }),
}));

const { registerUser, requestPasswordReset, resetPassword } = await import("@/lib/services/auth");
const { sessionJwtCallback } = await import("@/lib/services/session");
const { requireVerifiedUser } = await import("@/lib/auth/guards");
const { SESSION_EXPIRED_MESSAGE, sessionStatus } = await import("@/lib/auth/session");

const db = createTestClient();

// Secret de test, propre à ce fichier : aucun lien avec AUTH_SECRET.
const jwtParams = { secret: "secret-de-test-uniquement-0123456789abcdef", salt: "authjs.session-token" };

const PASSWORD = "motdepasse";
const NEW_PASSWORD = "nouveau-mdp-123";

const redirectTo = (path: string) =>
  expect.objectContaining({ digest: expect.stringContaining(`;${path};`) });

/** Compte validé, prêt à recevoir une demande de réinitialisation. */
async function verifiedUser(username = "alice") {
  const email = `${username}@example.test`;
  await registerUser({ username, firstName: "A", lastName: "B", email, password: PASSWORD });
  const user = await db.user.update({
    where: { email },
    data: { emailVerifiedAt: new Date() },
  });
  return user;
}

async function resetAt(email: string, now: Date) {
  await requestPasswordReset({ email }, now);
  const token = sent.at(-1)!.text.match(/\/reinitialiser\/([A-Za-z0-9_-]+)/)![1];
  expect(await resetPassword({ token, password: NEW_PASSWORD, confirm: NEW_PASSWORD }, now)).toEqual({ ok: true });
}

/** Connexion simulée : le callback jwt reçoit `user`, comme lors d'un signIn. */
async function signInToken(userId: string): Promise<JWT> {
  const token = await sessionJwtCallback({
    token: {},
    user: { id: userId },
    account: null,
  } as Parameters<typeof sessionJwtCallback>[0]);
  if (!token) throw new Error("connexion refusée");
  // Aller-retour par un vrai JWT chiffré, comme le cookie de session.
  return (await decode({ ...jwtParams, token: await encode({ ...jwtParams, token }) }))!;
}

/** Lecture d'une session existante : le callback jwt reçoit le token seul. */
function readSession(token: JWT) {
  return sessionJwtCallback({ token } as Parameters<typeof sessionJwtCallback>[0]);
}

beforeEach(async () => {
  await resetDatabase(db);
  sent.length = 0;
  ctx.session = null;
  ctx.cookieNames = [];
});

afterAll(async () => {
  await db.$disconnect();
});

describe("invalidation des sessions après réinitialisation", () => {
  it("refuse l'ancien JWT dans le callback jwt et dans le guard", async () => {
    const user = await verifiedUser();
    const oldToken = await signInToken(user.id);
    expect(await readSession(oldToken)).not.toBeNull();

    await resetAt(user.email, new Date(oldToken.authTime! + 1000));

    // 1er contrôle : callback jwt → null (Auth.js supprime alors le cookie).
    expect(await readSession(oldToken)).toBeNull();

    // 2e contrôle : guard, même si une session lui parvenait quand même.
    ctx.session = { user: { id: user.id }, authTime: oldToken.authTime };
    await expect(requireVerifiedUser()).rejects.toEqual(redirectTo("/session-expiree"));
  });

  it("le ré-encodage du JWT (nouvel iat) ne contourne pas le contrôle", async () => {
    const user = await verifiedUser();
    const oldToken = await signInToken(user.id);
    await resetAt(user.email, new Date(oldToken.authTime! + 1000));

    await new Promise((r) => setTimeout(r, 1100)); // iat est en secondes
    const reencoded = (await decode({ ...jwtParams, token: await encode({ ...jwtParams, token: oldToken }) }))!;
    expect(reencoded.iat).toBeGreaterThan(oldToken.iat as number);
    expect(reencoded.authTime).toBe(oldToken.authTime);
    expect(await readSession(reencoded)).toBeNull();
  });

  it("accepte le nouveau JWT obtenu par une nouvelle connexion", async () => {
    const user = await verifiedUser();
    await resetAt(user.email, new Date(Date.now() - 1000));

    const newToken = await signInToken(user.id);
    expect(await readSession(newToken)).toMatchObject({ sub: user.id });

    ctx.session = { user: { id: user.id }, authTime: newToken.authTime };
    await expect(requireVerifiedUser()).resolves.toMatchObject({ id: user.id });
  });

  it("accepte une connexion dans la même milliseconde que la réinitialisation", async () => {
    const user = await verifiedUser();
    const now = new Date();
    await resetAt(user.email, now);

    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordChangedAt?.getTime()).toBe(now.getTime());

    const token: JWT = { sub: user.id, authTime: now.getTime() };
    expect(await readSession(token)).toMatchObject({ sub: user.id });
    ctx.session = { user: { id: user.id }, authTime: now.getTime() };
    await expect(requireVerifiedUser()).resolves.toMatchObject({ id: user.id });
  });

  it("refuse une session antérieure de 50 ms (décalage d'horloge) et demande de se reconnecter", async () => {
    const user = await verifiedUser();
    const now = new Date();
    await resetAt(user.email, now);
    const authTime = now.getTime() - 50;

    expect(await readSession({ sub: user.id, authTime })).toBeNull();
    ctx.session = { user: { id: user.id }, authTime };
    await expect(requireVerifiedUser()).rejects.toEqual(redirectTo("/session-expiree"));

    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const status = sessionStatus(authTime, stored.passwordChangedAt);
    expect(status).toEqual({ ok: false, message: SESSION_EXPIRED_MESSAGE });
    expect(SESSION_EXPIRED_MESSAGE).toMatch(/reconnecter/);
  });

  it("ne touche pas aux sessions des autres utilisateurs", async () => {
    const alice = await verifiedUser("alice");
    const bob = await verifiedUser("bob");
    const bobToken = await signInToken(bob.id);
    await resetAt(alice.email, new Date(bobToken.authTime! + 1000));
    expect(await readSession(bobToken)).toMatchObject({ sub: bob.id });
  });
});

describe("guard : session refusée par le callback jwt", () => {
  it("envoie vers /session-expiree si auth() est nul mais que le cookie est resté", async () => {
    ctx.cookieNames = ["authjs.session-token"];
    await expect(requireVerifiedUser()).rejects.toEqual(redirectTo("/session-expiree"));
  });

  it("envoie vers /connexion sans cookie de session", async () => {
    ctx.cookieNames = ["authjs.csrf-token"];
    await expect(requireVerifiedUser()).rejects.toEqual(redirectTo("/connexion"));
  });
});
