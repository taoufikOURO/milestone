import { randomInt } from "node:crypto";

// Code promo (§4.2) : unique et non devinable. Tirage cryptographique
// (crypto.randomInt) dans un alphabet sans caractères ambigus : ni 0/O, ni 1/I/L.
// 31 symboles sur 10 positions : 31^10 ≈ 8 × 10^14 codes (≈ 49 bits).

export const PROMO_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const PROMO_CODE_LENGTH = 10;

/** Source d'entiers dans [0, max). Injectée par les tests uniquement. */
export type RandomIntSource = (max: number) => number;

const cryptoSource: RandomIntSource = (max) => randomInt(max);

export function generatePromoCode(random: RandomIntSource = cryptoSource): string {
  let code = "";
  for (let i = 0; i < PROMO_CODE_LENGTH; i += 1) {
    code += PROMO_CODE_ALPHABET[random(PROMO_CODE_ALPHABET.length)];
  }
  return code;
}

/** Saisie utilisateur : majuscules, sans espaces ni tirets. */
export function normalizePromoCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

const FORMAT = new RegExp(`^[${PROMO_CODE_ALPHABET}]{${PROMO_CODE_LENGTH}}$`);

export function isPromoCodeFormat(code: string): boolean {
  return FORMAT.test(code);
}

/** Affichage en deux blocs (« ABCDE-FGHJK ») ; la saisie accepte les deux formes. */
export function formatPromoCode(code: string): string {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)}-${code.slice(half)}`;
}
