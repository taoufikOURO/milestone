import { dateOfDay } from "@/lib/domain/timeline";

// Géométrie du calendrier mensuel. Module pur : les jours sont des numéros de
// jour (jours depuis 1970-01-01 UTC), sans fuseau horaire. Les semaines
// commencent le lundi.

export type YearMonth = { year: number; month: number }; // month : 0 = janvier

const DAY_MS = 86_400_000;

/** Numéro de jour du 1er du mois. */
export const firstDayOfMonth = ({ year, month }: YearMonth) => Math.floor(Date.UTC(year, month, 1) / DAY_MS);

/** Nombre de jours du mois (28 à 31). */
export const daysInMonth = ({ year, month }: YearMonth) =>
  firstDayOfMonth({ year, month: month + 1 }) - firstDayOfMonth({ year, month });

/** Colonne du jour dans la semaine : 0 = lundi … 6 = dimanche. */
export const weekdayIndex = (day: number) => (((day + 3) % 7) + 7) % 7; // 1970-01-01 était un jeudi

/** Mois (année, 0-11) d'un numéro de jour. */
export function monthOfDay(day: number): YearMonth {
  const d = dateOfDay(day);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/** Mois précédent (delta < 0) ou suivant (delta > 0), à cheval sur les années. */
export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + month + delta;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

/**
 * Semaines complètes (7 jours, lundi en premier) qui couvrent le mois : chaque
 * semaine est donnée par le numéro de son lundi. Le 1er est dans la première
 * semaine, au bon jour.
 */
export function monthWeeks(ym: YearMonth): number[] {
  const first = firstDayOfMonth(ym);
  const last = first + daysInMonth(ym) - 1;
  const weeks: number[] = [];
  for (let monday = first - weekdayIndex(first); monday <= last; monday += 7) weeks.push(monday);
  return weeks;
}

export type BlockInput = {
  id: string;
  start: number;
  end: number;
  /** Deadline du groupe (dernier jour permis) : ce qui la dépasse est en retard. */
  deadline?: number;
};

export type DaySegment = { start: number; end: number };

/**
 * Coupe un intervalle (bornes incluses) à la deadline : la partie jusqu'à la
 * deadline incluse, et la partie qui la dépasse (à partir du lendemain). Une
 * partie vide vaut null : tâche entièrement après la deadline → `normal` null.
 */
export function splitAtDeadline(
  item: { start: number; end: number },
  deadline: number,
): { normal: DaySegment | null; overdue: DaySegment | null } {
  if (item.end < item.start) return { normal: null, overdue: null };
  return {
    normal: item.start <= deadline ? { start: item.start, end: Math.min(item.end, deadline) } : null,
    overdue: item.end > deadline ? { start: Math.max(item.start, deadline + 1), end: item.end } : null,
  };
}

export type DeadlineMarker = { groupId: string; groupName: string };

/**
 * Repères de deadline par jour : un par groupe, au jour de sa fin. Plusieurs
 * groupes le même jour sont triés par nom puis identifiant, pour un ordre
 * stable quel que soit l'ordre d'entrée.
 */
export function deadlinesByDay(
  groups: readonly { id: string; name: string; endDay: number }[],
): Map<number, DeadlineMarker[]> {
  const sorted = [...groups].sort(
    (a, b) => a.endDay - b.endDay || a.name.localeCompare(b.name, "fr") || a.id.localeCompare(b.id),
  );
  const byDay = new Map<number, DeadlineMarker[]>();
  for (const g of sorted) {
    const list = byDay.get(g.endDay) ?? [];
    list.push({ groupId: g.id, groupName: g.name });
    byDay.set(g.endDay, list);
  }
  return byDay;
}

export type WeekBlock = {
  id: string;
  /** Colonne de départ, 0 (lundi) à 6. */
  col: number;
  /** Nombre de colonnes occupées (1 à 7). */
  span: number;
  /** Ligne d'empilement dans la semaine, à partir de 0. */
  lane: number;
  /** Le bloc commence avant cette semaine (coupé au bord gauche). */
  continuesBefore: boolean;
  /** Le bloc se termine après cette semaine (coupé au bord droit). */
  continuesAfter: boolean;
  /**
   * Colonnes (sur `span`) avant ou à la deadline, en couleur normale ; les
   * `span - normalSpan` suivantes dépassent la deadline. Égal à `span` sans deadline.
   */
  normalSpan: number;
};

/**
 * Découpe un intervalle (bornes incluses) à la semaine qui commence au lundi
 * `monday` : null s'il ne la touche pas.
 */
export function clipToWeek(
  item: { start: number; end: number },
  monday: number,
): Pick<WeekBlock, "col" | "span" | "continuesBefore" | "continuesAfter"> | null {
  const sunday = monday + 6;
  if (item.end < item.start || item.end < monday || item.start > sunday) return null;
  const from = Math.max(item.start, monday);
  const to = Math.min(item.end, sunday);
  return {
    col: from - monday,
    span: to - from + 1,
    continuesBefore: item.start < monday,
    continuesAfter: item.end > sunday,
  };
}

/**
 * Blocs d'une semaine, avec leur colonne, leur largeur et leur ligne. Les blocs
 * les plus longs d'abord, puis par début et identifiant : le résultat ne dépend
 * pas de l'ordre d'entrée. Chaque bloc prend la première ligne libre sur toute
 * sa largeur.
 */
export function layoutWeek(monday: number, items: readonly BlockInput[]): WeekBlock[] {
  const clipped = items.flatMap((item) => {
    const c = clipToWeek(item, monday);
    if (!c) return [];
    const normal = item.deadline === undefined ? null : splitAtDeadline(item, item.deadline).normal;
    const normalSpan =
      item.deadline === undefined ? c.span : normal ? (clipToWeek(normal, monday)?.span ?? 0) : 0;
    return [{ id: item.id, start: item.start, normalSpan, ...c }];
  });
  clipped.sort((a, b) => b.span - a.span || a.start - b.start || a.id.localeCompare(b.id));

  const lanes: boolean[][] = []; // lanes[lane][col] : colonne occupée
  return clipped.map(({ id, col, span, continuesBefore, continuesAfter, normalSpan }) => {
    let lane = lanes.findIndex((cols) => cols.slice(col, col + span).every((taken) => !taken));
    if (lane === -1) {
      lanes.push(new Array<boolean>(7).fill(false));
      lane = lanes.length - 1;
    }
    for (let c = col; c < col + span; c++) lanes[lane][c] = true;
    return { id, col, span, lane, continuesBefore, continuesAfter, normalSpan };
  });
}

export type DotKind = "task" | "meeting" | "deadline" | "overdue";

/** Nombre maximal de pastilles visibles dans une case de la grille compacte. */
export const MAX_DAY_DOTS = 3;

/**
 * Pastilles d'une journée pour la grille compacte (mobile). Ordre : tâches
 * en dépassement, deadlines, tâches dans les délais, réunions. Au plus
 * `MAX_DAY_DOTS` visibles ; `more` compte les autres (« + n »). Une tâche est en
 * dépassement le jour où elle est au-delà de la deadline de son groupe.
 * `tasks` ne contient que les tâches planifiées ce jour-là.
 */
export function dayDots(
  day: number,
  content: { tasks: readonly { deadline: number }[]; meetings: number; deadlines: number },
): { dots: DotKind[]; more: number } {
  const overdue = content.tasks.filter((t) => day > t.deadline).length;
  const all: DotKind[] = [
    ...Array<DotKind>(overdue).fill("overdue"),
    ...Array<DotKind>(content.deadlines).fill("deadline"),
    ...Array<DotKind>(content.tasks.length - overdue).fill("task"),
    ...Array<DotKind>(content.meetings).fill("meeting"),
  ];
  return { dots: all.slice(0, MAX_DAY_DOTS), more: Math.max(0, all.length - MAX_DAY_DOTS) };
}
