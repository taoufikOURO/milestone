import { describe, expect, it } from "vitest";
import {
  formatPromoCode,
  generatePromoCode,
  isPromoCodeFormat,
  normalizePromoCode,
  PROMO_CODE_ALPHABET,
  PROMO_CODE_LENGTH,
} from "@/lib/promo-code";

describe("génération du code promo", () => {
  it("produit un code d'environ 10 caractères dans l'alphabet", () => {
    for (let i = 0; i < 1000; i += 1) {
      const code = generatePromoCode();
      expect(code).toHaveLength(PROMO_CODE_LENGTH);
      expect(isPromoCodeFormat(code)).toBe(true);
      for (const c of code) expect(PROMO_CODE_ALPHABET).toContain(c);
    }
  });

  it("exclut les caractères ambigus", () => {
    for (const c of ["0", "O", "1", "I", "L"]) {
      expect(PROMO_CODE_ALPHABET).not.toContain(c);
    }
    // Alphabet sans doublon.
    expect(new Set(PROMO_CODE_ALPHABET).size).toBe(PROMO_CODE_ALPHABET.length);
  });

  it("utilise chaque symbole de l'alphabet selon la source aléatoire", () => {
    let n = 0;
    const sequential = (max: number) => n++ % max;
    const seen = new Set<string>();
    for (let i = 0; i < 4; i += 1) for (const c of generatePromoCode(sequential)) seen.add(c);
    expect(seen.size).toBe(PROMO_CODE_ALPHABET.length);
  });

  it("ne produit pas de doublon sur un grand nombre d'essais", () => {
    const count = 100_000;
    const codes = new Set<string>();
    for (let i = 0; i < count; i += 1) codes.add(generatePromoCode());
    expect(codes.size).toBe(count);
  });
});

describe("saisie et affichage du code", () => {
  it("normalise la casse, les espaces et les tirets", () => {
    expect(normalizePromoCode(" abcde-fghjk ")).toBe("ABCDEFGHJK");
    expect(normalizePromoCode("ab cd ef gh jk")).toBe("ABCDEFGHJK");
  });

  it("refuse un format inattendu", () => {
    expect(isPromoCodeFormat("ABCDEFGHJ")).toBe(false);
    expect(isPromoCodeFormat("ABCDEFGHJ0")).toBe(false);
    expect(isPromoCodeFormat("abcdefghjk")).toBe(false);
  });

  it("affiche le code en deux blocs, relu tel quel après normalisation", () => {
    const code = generatePromoCode();
    const shown = formatPromoCode(code);
    expect(shown).toMatch(/^.{5}-.{5}$/);
    expect(normalizePromoCode(shown)).toBe(code);
  });
});
