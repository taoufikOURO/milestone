import { describe, expect, it } from "vitest";
import { proxyRedirect, safeCallbackPath } from "@/lib/routes";

describe("redirections du proxy", () => {
  it("laisse passer les pages publiques sans session", () => {
    for (const p of ["/", "/connexion", "/inscription", "/mot-de-passe-oublie", "/reinitialiser/abc", "/verifier-email/abc", "/session-expiree"]) {
      expect(proxyRedirect(p, "", false)).toBeNull();
    }
  });

  it("envoie vers la connexion les autres pages sans session", () => {
    expect(proxyRedirect("/verifier-email", "", false)).toBe("/connexion?callbackUrl=%2Fverifier-email");
    expect(proxyRedirect("/promo", "?a=1", false)).toBe("/connexion?callbackUrl=%2Fpromo%3Fa%3D1");
  });

  it("renvoie un utilisateur connecté hors des pages de connexion et d'inscription", () => {
    expect(proxyRedirect("/connexion", "", true)).toBe("/accueil");
    expect(proxyRedirect("/inscription", "", true)).toBe("/accueil");
    expect(proxyRedirect("/verifier-email", "", true)).toBeNull();
  });
});

describe("safeCallbackPath", () => {
  it("n'accepte que les chemins internes", () => {
    expect(safeCallbackPath("/promo")).toBe("/promo");
    expect(safeCallbackPath("//evil.example")).toBeNull();
    expect(safeCallbackPath("/\\evil.example")).toBeNull();
    expect(safeCallbackPath("https://evil.example")).toBeNull();
    expect(safeCallbackPath(undefined)).toBeNull();
  });
});
