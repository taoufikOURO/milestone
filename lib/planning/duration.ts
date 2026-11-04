// Durée effective (§4.6, décision 3). Module pur.

/**
 * ceil(durée × (1 + marge/100)), calculé sur des entiers : en flottant,
 * 50 × 1.1 vaut 55.00000000000001 et donnerait 56 au lieu de 55. Le quotient
 * d'entiers par 100 est exact lorsqu'il est entier, sinon il est à au moins
 * 0,01 d'un entier : Math.ceil ne peut pas se tromper.
 */
export function effectiveDuration(durationDays: number, marginPercent: number): number {
  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new RangeError(`Durée invalide : ${durationDays}.`);
  }
  if (!Number.isInteger(marginPercent) || marginPercent < 0 || marginPercent > 100) {
    throw new RangeError(`Marge invalide : ${marginPercent}.`);
  }
  return Math.ceil((durationDays * (100 + marginPercent)) / 100);
}
