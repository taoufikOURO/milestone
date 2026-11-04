import { describe, expect, it } from "vitest";
import { isActivePath, NAV_ITEMS } from "@/lib/nav";

describe("navigation", () => {
  it("expose les quatre entrées du §6.4", () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(["Accueil", "Promo", "Mon calendrier", "Profil"]);
  });

  it("marque actif le lien exact et ses sous-pages, pas un préfixe voisin", () => {
    expect(isActivePath("/promo", "/promo")).toBe(true);
    expect(isActivePath("/promo", "/promo/gestion")).toBe(true);
    expect(isActivePath("/promo", "/promotion")).toBe(false);
    expect(isActivePath("/accueil", "/profil")).toBe(false);
  });
});
