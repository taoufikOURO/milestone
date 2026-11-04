import { describe, expect, it } from "vitest";
import {
  clipToWeek,
  daysInMonth,
  firstDayOfMonth,
  layoutWeek,
  monthOfDay,
  monthWeeks,
  shiftMonth,
  weekdayIndex,
} from "@/lib/domain/month-grid";

const day = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);

describe("monthWeeks", () => {
  it("place le 1er sur la bonne colonne (lundi = 0)", () => {
    // 1er nov. 2026 : dimanche ; 1er fév. 2027 : lundi ; 1er janv. 1970 : jeudi.
    expect(weekdayIndex(day(2026, 11, 1))).toBe(6);
    expect(weekdayIndex(day(2027, 2, 1))).toBe(0);
    expect(weekdayIndex(day(1970, 1, 1))).toBe(3);
    expect(weekdayIndex(day(1969, 12, 31))).toBe(2);
  });

  it("couvre le mois par des semaines complètes commençant un lundi", () => {
    const weeks = monthWeeks({ year: 2026, month: 10 }); // novembre 2026
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toBe(day(2026, 10, 26));
    expect(weeks.every((m) => weekdayIndex(m) === 0)).toBe(true);
    expect(weeks[5] + 6).toBeGreaterThanOrEqual(day(2026, 11, 30));
    // Le 1er est dans la première semaine, le dernier jour dans la dernière.
    expect(firstDayOfMonth({ year: 2026, month: 10 })).toBeLessThanOrEqual(weeks[0] + 6);
  });

  it.each([
    { label: "février 2027 (28 j, lundi au dimanche)", ym: { year: 2027, month: 1 }, days: 28, weeks: 4 },
    { label: "février 2024 (29 j)", ym: { year: 2024, month: 1 }, days: 29, weeks: 5 },
    { label: "avril 2026 (30 j)", ym: { year: 2026, month: 3 }, days: 30, weeks: 5 },
    { label: "mai 2026 (31 j, 1er un vendredi)", ym: { year: 2026, month: 4 }, days: 31, weeks: 5 },
    { label: "août 2026 (31 j, 1er un samedi)", ym: { year: 2026, month: 7 }, days: 31, weeks: 6 },
  ])("$label", ({ ym, days, weeks }) => {
    expect(daysInMonth(ym)).toBe(days);
    const grid = monthWeeks(ym);
    expect(grid).toHaveLength(weeks);
    const first = firstDayOfMonth(ym);
    const last = first + days - 1;
    expect(grid[0]).toBeLessThanOrEqual(first);
    expect(first - grid[0]).toBe(weekdayIndex(first));
    expect(grid[grid.length - 1] + 6).toBeGreaterThanOrEqual(last);
    expect(grid[grid.length - 1]).toBeLessThanOrEqual(last);
  });
});

describe("mois", () => {
  it("monthOfDay et shiftMonth passent d'une année à l'autre", () => {
    expect(monthOfDay(day(2026, 11, 4))).toEqual({ year: 2026, month: 10 });
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 5 }, 0)).toEqual({ year: 2026, month: 5 });
  });
});

describe("clipToWeek", () => {
  const monday = day(2026, 11, 2);

  it("place une tâche de la semaine sur ses colonnes", () => {
    expect(clipToWeek({ start: monday + 1, end: monday + 3 }, monday)).toEqual({
      col: 1,
      span: 3,
      continuesBefore: false,
      continuesAfter: false,
    });
  });

  it("coupe une tâche qui traverse la semaine suivante au dimanche, puis la reprend le lundi", () => {
    const task = { start: monday + 4, end: monday + 9 }; // vendredi → mercredi suivant
    expect(clipToWeek(task, monday)).toEqual({ col: 4, span: 3, continuesBefore: false, continuesAfter: true });
    expect(clipToWeek(task, monday + 7)).toEqual({ col: 0, span: 3, continuesBefore: true, continuesAfter: false });
  });

  it("couvre les 7 colonnes d'une semaine traversée de bout en bout", () => {
    expect(clipToWeek({ start: monday - 3, end: monday + 20 }, monday)).toEqual({
      col: 0,
      span: 7,
      continuesBefore: true,
      continuesAfter: true,
    });
  });

  it("ignore une tâche hors de la semaine ou invalide", () => {
    expect(clipToWeek({ start: monday - 5, end: monday - 1 }, monday)).toBeNull();
    expect(clipToWeek({ start: monday + 7, end: monday + 8 }, monday)).toBeNull();
    expect(clipToWeek({ start: monday + 3, end: monday + 2 }, monday)).toBeNull();
  });

  it("garde une tâche d'un seul jour", () => {
    expect(clipToWeek({ start: monday + 6, end: monday + 6 }, monday)).toMatchObject({ col: 6, span: 1 });
  });
});

describe("layoutWeek", () => {
  const monday = day(2026, 11, 2);

  it("range sur la même ligne les blocs qui ne se chevauchent pas", () => {
    const blocks = layoutWeek(monday, [
      { id: "a", start: monday, end: monday + 1 },
      { id: "b", start: monday + 2, end: monday + 4 },
    ]);
    expect(blocks.find((b) => b.id === "a")).toMatchObject({ col: 0, span: 2, lane: 0 });
    expect(blocks.find((b) => b.id === "b")).toMatchObject({ col: 2, span: 3, lane: 0 });
  });

  it("empile sur une autre ligne les blocs qui se chevauchent", () => {
    const blocks = layoutWeek(monday, [
      { id: "long", start: monday, end: monday + 5 },
      { id: "court", start: monday + 2, end: monday + 3 },
      { id: "autre", start: monday + 3, end: monday + 3 },
    ]);
    const lane = (id: string) => blocks.find((b) => b.id === id)!.lane;
    expect(lane("long")).toBe(0);
    expect(lane("court")).toBe(1);
    expect(lane("autre")).toBe(2);
  });

  it("réutilise une ligne libérée", () => {
    const blocks = layoutWeek(monday, [
      { id: "x", start: monday, end: monday + 4 },
      { id: "y", start: monday, end: monday },
      { id: "z", start: monday + 1, end: monday + 1 },
    ]);
    expect(blocks.find((b) => b.id === "y")!.lane).toBe(1);
    expect(blocks.find((b) => b.id === "z")!.lane).toBe(1);
  });

  it("donne le même résultat quel que soit l'ordre d'entrée", () => {
    const items = [
      { id: "a", start: monday, end: monday + 3 },
      { id: "b", start: monday + 1, end: monday + 2 },
      { id: "c", start: monday + 2, end: monday + 6 },
    ];
    const sorted = (list: typeof items) => [...layoutWeek(monday, list)].sort((p, q) => p.id.localeCompare(q.id));
    expect(sorted([...items].reverse())).toEqual(sorted(items));
  });

  it("n'inclut que les blocs de la semaine, coupés à ses bords", () => {
    const blocks = layoutWeek(monday, [
      { id: "avant", start: monday - 10, end: monday - 1 },
      { id: "à cheval", start: monday + 5, end: monday + 12 },
    ]);
    expect(blocks).toEqual([
      { id: "à cheval", col: 5, span: 2, lane: 0, continuesBefore: false, continuesAfter: true },
    ]);
  });
});
