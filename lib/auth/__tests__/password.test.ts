import { describe, expect, it } from "vitest";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";

describe("hachage du mot de passe (argon2id)", () => {
  it("produit un hash argon2id qui ne contient pas le mot de passe", async () => {
    const hash = await hashPassword("motdepasse-solide");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(hash).not.toContain("motdepasse-solide");
  });

  it("utilise un sel différent à chaque hachage", async () => {
    const [a, b] = await Promise.all([hashPassword("identique"), hashPassword("identique")]);
    expect(a).not.toBe(b);
  });

  it("vérifie le bon mot de passe et refuse un mauvais", async () => {
    const hash = await hashPassword("motdepasse-solide");
    expect(await verifyPassword(hash, "motdepasse-solide")).toBe(true);
    expect(await verifyPassword(hash, "motdepasse-Solide")).toBe(false);
    expect(await verifyPassword(hash, "")).toBe(false);
  });

  it("refuse sans exception un hash illisible", async () => {
    expect(await verifyPassword("pas-un-hash", "x")).toBe(false);
  });

  it("la vérification « dans le vide » renvoie toujours false", async () => {
    expect(await verifyAgainstDummy("milestone-dummy-password")).toBe(false);
  });
});
