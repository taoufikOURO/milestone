import { describe, expect, it } from "vitest";
import { resetPasswordSchema, signUpSchema } from "@/lib/validation/auth";

const valid = {
  username: "  Alice.M ",
  firstName: " Alice ",
  lastName: "Martin",
  email: " Alice@Example.COM ",
  password: "12345678",
};

describe("schéma d'inscription", () => {
  it("accepte une inscription valide et normalise username et email", () => {
    const r = signUpSchema.parse(valid);
    expect(r.username).toBe("alice.m");
    expect(r.email).toBe("alice@example.com");
    expect(r.firstName).toBe("Alice");
  });

  it("refuse un mot de passe de moins de 8 caractères (§11 critère 3)", () => {
    const r = signUpSchema.safeParse({ ...valid, password: "1234567" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ["password"] });
  });

  it("refuse un nom d'utilisateur avec des caractères interdits", () => {
    expect(signUpSchema.safeParse({ ...valid, username: "a b" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, username: "ab" }).success).toBe(false);
  });

  it("refuse un email invalide et des champs vides", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "pas-un-email" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, firstName: "  " }).success).toBe(false);
  });
});

describe("schéma de réinitialisation", () => {
  const token = "x".repeat(43);

  it("exige 8 caractères et deux saisies identiques", () => {
    expect(resetPasswordSchema.safeParse({ token, password: "1234567", confirm: "1234567" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token, password: "12345678", confirm: "12345679" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token, password: "12345678", confirm: "12345678" }).success).toBe(true);
  });
});
