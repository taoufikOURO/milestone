import { decode, encode, type JWT } from "next-auth/jwt";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestClient, resetDatabase } from "@/tests/test-db";

vi.mock("@/lib/email", () => ({ sendEmail: async () => {} }));
vi.mock("@/auth", () => ({ auth: async () => null }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));

const { registerUser, authenticate } = await import("@/lib/services/auth");
const { sessionJwtCallback } = await import("@/lib/services/session");
const { changePassword, updateProfile, WRONG_CURRENT_PASSWORD, USERNAME_READONLY } = await import(
  "@/lib/services/user"
);

const db = createTestClient();

const jwtParams = { secret: "secret-de-test-uniquement-0123456789abcdef", salt: "authjs.session-token" };
const PASSWORD = "motdepasse";
const NEW_PASSWORD = "nouveau-mdp-123";

async function verifiedUser(username = "alice") {
  const email = `${username}@example.test`;
  await registerUser({ username, firstName: "A", lastName: "B", email, password: PASSWORD });
  return db.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
}

/** Connexion simulée, comme dans session.int.test.ts : le callback jwt reçoit `user`. */
async function signInToken(userId: string): Promise<JWT> {
  const token = await sessionJwtCallback({
    token: {},
    user: { id: userId },
    account: null,
  } as Parameters<typeof sessionJwtCallback>[0]);
  if (!token) throw new Error("connexion refusée");
  return (await decode({ ...jwtParams, token: await encode({ ...jwtParams, token }) }))!;
}

function readSession(token: JWT) {
  return sessionJwtCallback({ token } as Parameters<typeof sessionJwtCallback>[0]);
}

beforeEach(async () => {
  await resetDatabase(db);
});

afterAll(async () => {
  await db.$disconnect();
});

describe("modification du profil", () => {
  it("met à jour le prénom et le nom", async () => {
    const user = await verifiedUser();
    expect(await updateProfile(user.id, { firstName: " Alice ", lastName: "Martin" })).toEqual({ ok: true });
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored).toMatchObject({ firstName: "Alice", lastName: "Martin" });
  });

  it("refuse la requête si elle contient un nom d'utilisateur, sans rien écrire", async () => {
    const user = await verifiedUser();
    const result = await updateProfile(user.id, { firstName: "Nouveau", lastName: "Nom", username: "pirate" });
    expect(result).toEqual({ ok: false, errors: { form: USERNAME_READONLY } });
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored).toMatchObject({ username: "alice", firstName: "A", lastName: "B" });
  });

  it("n'affecte pas un autre utilisateur", async () => {
    const alice = await verifiedUser("alice");
    const bob = await verifiedUser("bob");
    await updateProfile(alice.id, { firstName: "Alice", lastName: "Martin" });
    const storedBob = await db.user.findUniqueOrThrow({ where: { id: bob.id } });
    expect(storedBob).toMatchObject({ firstName: "A", lastName: "B", passwordHash: bob.passwordHash });
  });
});

describe("changement de mot de passe", () => {
  it("refuse un mauvais ancien mot de passe, sans rien modifier", async () => {
    const user = await verifiedUser();
    const result = await changePassword(user.id, { currentPassword: "mauvais-mdp-1", newPassword: NEW_PASSWORD });
    expect(result).toEqual({ ok: false, errors: { currentPassword: WRONG_CURRENT_PASSWORD } });
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).toBe(user.passwordHash);
    expect(stored.passwordChangedAt).toBeNull();
  });

  it("refuse un nouveau mot de passe identique à l'ancien", async () => {
    const user = await verifiedUser();
    const result = await changePassword(user.id, { currentPassword: PASSWORD, newPassword: PASSWORD });
    expect(result).toMatchObject({ ok: false, errors: { newPassword: expect.any(String) } });
  });

  it("change le mot de passe : l'ancien est refusé à la connexion, le nouveau accepté", async () => {
    const user = await verifiedUser();
    const now = new Date();
    expect(await changePassword(user.id, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD }, now)).toEqual({
      ok: true,
    });

    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordChangedAt?.getTime()).toBe(now.getTime());
    expect(await authenticate({ email: user.email, password: PASSWORD })).toBeNull();
    expect(await authenticate({ email: user.email, password: NEW_PASSWORD })).toMatchObject({ id: user.id });
  });

  it("refuse l'ancien JWT après le changement et accepte le nouveau JWT", async () => {
    const user = await verifiedUser();
    const oldToken = await signInToken(user.id);
    expect(await readSession(oldToken)).not.toBeNull();

    await changePassword(
      user.id,
      { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
      new Date(oldToken.authTime! + 1000),
    );
    expect(await readSession(oldToken)).toBeNull();

    // Nouvelle connexion (ce que fait l'action avec signIn) : session valide.
    await new Promise((r) => setTimeout(r, 1100));
    const newToken = await signInToken(user.id);
    expect(newToken.authTime).toBeGreaterThan(oldToken.authTime! + 1000);
    expect(await readSession(newToken)).toMatchObject({ sub: user.id });
  });

  it("n'invalide pas les sessions ni le mot de passe d'un autre utilisateur", async () => {
    const alice = await verifiedUser("alice");
    const bob = await verifiedUser("bob");
    const bobToken = await signInToken(bob.id);

    await changePassword(
      alice.id,
      { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
      new Date(bobToken.authTime! + 1000),
    );

    expect(await readSession(bobToken)).toMatchObject({ sub: bob.id });
    expect(await authenticate({ email: bob.email, password: PASSWORD })).toMatchObject({ id: bob.id });
    const storedBob = await db.user.findUniqueOrThrow({ where: { id: bob.id } });
    expect(storedBob.passwordChangedAt).toBeNull();
  });
});
