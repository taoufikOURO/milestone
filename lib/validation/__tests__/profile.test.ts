import { describe, expect, it } from "vitest";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validation/profile";

describe("schéma de modification du profil", () => {
  it("accepte et normalise (trim) le prénom et le nom", () => {
    expect(updateProfileSchema.parse({ firstName: "  Alice ", lastName: " Martin " })).toEqual({
      firstName: "Alice",
      lastName: "Martin",
    });
  });

  it("refuse un prénom ou un nom vide ou trop long", () => {
    expect(updateProfileSchema.safeParse({ firstName: " ", lastName: "B" }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ firstName: "A", lastName: "x".repeat(101) }).success).toBe(false);
  });

  it("refuse toute clé hors prénom et nom, dont le nom d'utilisateur", () => {
    for (const extra of [{ username: "pirate" }, { email: "x@y.test" }]) {
      const r = updateProfileSchema.safeParse({ firstName: "A", lastName: "B", ...extra });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].code).toBe("unrecognized_keys");
    }
  });
});

describe("schéma de changement de mot de passe", () => {
  const valid = { currentPassword: "ancien-mdp-1", newPassword: "nouveau-mdp-1" };

  it("accepte un nouveau mot de passe différent d'au moins 8 caractères", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: "12345678" }).success).toBe(true);
  });

  it("refuse un nouveau mot de passe identique à l'ancien", () => {
    const r = changePasswordSchema.safeParse({ currentPassword: "memeMotDePasse", newPassword: "memeMotDePasse" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ["newPassword"] });
  });

  it("refuse un nouveau mot de passe de moins de 8 caractères", () => {
    const r = changePasswordSchema.safeParse({ ...valid, newPassword: "1234567" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ["newPassword"] });
  });

  it("refuse un ancien mot de passe vide et une clé inconnue", () => {
    expect(changePasswordSchema.safeParse({ ...valid, currentPassword: "" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...valid, username: "x" }).success).toBe(false);
  });
});
