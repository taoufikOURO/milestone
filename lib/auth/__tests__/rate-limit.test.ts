import { describe, expect, it } from "vitest";
import { checkEmailRateLimit, EMAIL_MAX_PER_WINDOW } from "@/lib/auth/rate-limit";

const now = new Date("2026-11-04T12:00:00Z");
const ago = (s: number) => new Date(now.getTime() - s * 1000);

describe("limite de fréquence des emails", () => {
  it("autorise le premier envoi", () => {
    expect(checkEmailRateLimit([], now)).toEqual({ allowed: true });
  });

  it("impose une minute entre deux envois", () => {
    expect(checkEmailRateLimit([ago(20)], now)).toEqual({ allowed: false, retryAfterSeconds: 40 });
    expect(checkEmailRateLimit([ago(60)], now)).toEqual({ allowed: true });
  });

  it(`limite à ${EMAIL_MAX_PER_WINDOW} envois par heure`, () => {
    const five = [ago(3000), ago(2400), ago(1800), ago(1200), ago(600)];
    expect(checkEmailRateLimit(five, now)).toEqual({ allowed: false, retryAfterSeconds: 600 });
    expect(checkEmailRateLimit(five.slice(1), now)).toEqual({ allowed: true });
  });

  it("ignore les envois de plus d'une heure", () => {
    expect(checkEmailRateLimit([ago(3600), ago(4000), ago(5000), ago(6000), ago(7000)], now)).toEqual({
      allowed: true,
    });
  });
});
