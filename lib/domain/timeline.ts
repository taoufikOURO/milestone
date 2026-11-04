// Géométrie de la frise de la promo (§5.1). Module pur : les dates sont des
// colonnes DATE (minuit UTC), comptées en jours entiers, sans fuseau horaire.

const DAY_MS = 86_400_000;

export type DateRange = { start: Date; end: Date };
export type BarLayout = {
  /** Position du bord gauche, en % de la largeur de la frise. */
  leftPercent: number;
  /** Largeur, en % de la largeur de la frise. */
  widthPercent: number;
};

/** Numéro de jour (jours depuis 1970-01-01 UTC). */
export const dayNumber = (date: Date) => Math.floor(date.getTime() / DAY_MS);

/** Colonne DATE (minuit UTC) d'un numéro de jour. */
export const dateOfDay = (day: number) => new Date(day * DAY_MS);

/**
 * Numéro du jour calendaire de `now` dans le fuseau `timeZone` (ex. le
 * 4 novembre à 23 h 30 à Lomé, quelle que soit l'heure UTC).
 */
export function dayInTimeZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / DAY_MS);
}

/** Nombre de jours de la période, bornes incluses (début = fin → 1). */
export const spanDays = (range: DateRange) => dayNumber(range.end) - dayNumber(range.start) + 1;

/**
 * Période affichée : du plus ancien début à la plus tardive des fins. Null s'il
 * n'y a aucun groupe.
 */
export function displayRange(groups: readonly DateRange[]): DateRange | null {
  if (groups.length === 0) return null;
  let start = groups[0].start;
  let end = groups[0].end;
  for (const g of groups) {
    if (g.start < start) start = g.start;
    if (g.end > end) end = g.end;
  }
  return { start, end };
}

/**
 * Position et largeur d'une barre dans la période affichée. Les bornes sont
 * incluses : un groupe d'un seul jour occupe un jour. Une barre qui dépasse la
 * période est rognée ; hors de la période, ou période invalide : null.
 */
export function barLayout(group: DateRange, window: DateRange): BarLayout | null {
  const total = spanDays(window);
  if (total < 1 || dayNumber(group.end) < dayNumber(group.start)) return null;
  const from = Math.max(dayNumber(group.start), dayNumber(window.start));
  const to = Math.min(dayNumber(group.end), dayNumber(window.end));
  if (to < from) return null;
  return {
    leftPercent: ((from - dayNumber(window.start)) / total) * 100,
    widthPercent: ((to - from + 1) / total) * 100,
  };
}
