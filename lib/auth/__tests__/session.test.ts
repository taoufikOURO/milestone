import { describe, expect, it } from "vitest";
import {
  applySignIn,
  hasSessionCookie,
  isSessionCurrent,
  SESSION_EXPIRED_MESSAGE,
  sessionStatus,
} from "@/lib/auth/session";

const changedAt = new Date("2026-11-04T12:00:00.000Z");
const t = changedAt.getTime();

describe("validité d'une session après changement de mot de passe", () => {
  it("accepte toute session si le mot de passe n'a jamais changé", () => {
    expect(isSessionCurrent(undefined, null)).toBe(true);
    expect(isSessionCurrent(0, null)).toBe(true);
  });

  it("refuse une session ouverte avant le changement", () => {
    expect(isSessionCurrent(t - 1, changedAt)).toBe(false);
  });

  it("accepte une connexion dans la même milliseconde que le changement (>=)", () => {
    expect(isSessionCurrent(t, changedAt)).toBe(true);
    expect(isSessionCurrent(t + 1, changedAt)).toBe(true);
  });

  it("refuse un JWT sans authTime quand le mot de passe a changé", () => {
    expect(isSessionCurrent(undefined, changedAt)).toBe(false);
  });

  it("refuse une session antérieure de 50 ms et demande de se reconnecter", () => {
    const status = sessionStatus(t - 50, changedAt);
    expect(status).toEqual({ ok: false, message: SESSION_EXPIRED_MESSAGE });
    expect(SESSION_EXPIRED_MESSAGE).toMatch(/reconnecter/);
  });
});

describe("applySignIn", () => {
  it("pose l'identifiant et l'instant de connexion", () => {
    expect(applySignIn({ email: "a@b.c" }, "u1", t)).toEqual({ email: "a@b.c", sub: "u1", authTime: t });
  });
});

describe("hasSessionCookie", () => {
  it("reconnaît le cookie Auth.js, sécurisé ou découpé", () => {
    expect(hasSessionCookie(["authjs.session-token"])).toBe(true);
    expect(hasSessionCookie(["__Secure-authjs.session-token.0"])).toBe(true);
    expect(hasSessionCookie(["authjs.csrf-token", "autre"])).toBe(false);
  });
});
