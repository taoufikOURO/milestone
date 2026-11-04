import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResendResult } from "@/lib/services/auth";

const resend = vi.hoisted(() => ({ result: null as ResendResult | null }));

vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/auth/guards", () => ({
  requireUser: async () => ({ id: "u1", email: "alice@example.test", emailVerifiedAt: null }),
}));
vi.mock("@/lib/services/auth", () => ({
  registerUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  tokenErrorMessage: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerificationEmail: async () => resend.result,
}));

const { resendVerificationAction } = await import("@/lib/actions/auth");

describe("resendVerificationAction", () => {
  beforeEach(() => {
    resend.result = null;
  });

  it("en transport console, indique que le lien est dans le terminal", async () => {
    resend.result = { ok: true, transport: "console" };
    expect(await resendVerificationAction()).toEqual({
      message: "Mode développement : le lien est affiché dans le terminal.",
    });
  });

  it("en transport Brevo, confirme l'envoi à l'adresse du compte", async () => {
    resend.result = { ok: true, transport: "brevo" };
    expect(await resendVerificationAction()).toEqual({
      message: "Un nouveau lien a été envoyé à alice@example.test.",
    });
  });

  it.each([
    ["unauthorized", /clé API/],
    ["sender", /expédition n'est pas validée/],
    ["quota", /quota/],
  ] as const)("en transport Brevo, renvoie une erreur explicite (%s)", async (reason, expected) => {
    resend.result = { ok: false, error: "send_failed", reason };
    const state = await resendVerificationAction();
    expect(state.message).toBeUndefined();
    expect(state.error).toMatch(expected);
    // Ni statut HTTP, ni code fournisseur, ni adresse dans le message affiché.
    expect(state.error).not.toMatch(/HTTP|\d{3}|@|unauthorized|credits/i);
  });
});
