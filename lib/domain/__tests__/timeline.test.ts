import { describe, expect, it } from "vitest";
import { barLayout, dateOfDay, dayInTimeZone, dayNumber, displayRange } from "@/lib/domain/timeline";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const range = (a: string, b: string) => ({ start: d(a), end: d(b) });

describe("displayRange", () => {
  it("renvoie null sans groupe", () => {
    expect(displayRange([])).toBeNull();
  });

  it("va du plus ancien début à la plus tardive des fins", () => {
    expect(displayRange([range("2026-11-10", "2026-11-20"), range("2026-11-01", "2026-11-12"), range("2026-11-05", "2026-12-01")])).toEqual(
      range("2026-11-01", "2026-12-01"),
    );
  });
});

describe("barLayout", () => {
  const window = range("2026-11-01", "2026-11-10"); // 10 jours

  it("calcule la position et la largeur, bornes incluses", () => {
    expect(barLayout(range("2026-11-03", "2026-11-07"), window)).toEqual({ leftPercent: 20, widthPercent: 50 });
  });

  it("occupe toute la frise quand le groupe couvre la période", () => {
    expect(barLayout(window, window)).toEqual({ leftPercent: 0, widthPercent: 100 });
  });

  it("donne un jour de large quand début = fin", () => {
    expect(barLayout(range("2026-11-05", "2026-11-05"), window)).toEqual({ leftPercent: 40, widthPercent: 10 });
  });

  it("gère une période d'un seul jour", () => {
    const one = range("2026-11-05", "2026-11-05");
    expect(barLayout(one, one)).toEqual({ leftPercent: 0, widthPercent: 100 });
  });

  it("rogne un groupe qui dépasse la période", () => {
    expect(barLayout(range("2026-10-28", "2026-11-02"), window)).toEqual({ leftPercent: 0, widthPercent: 20 });
    expect(barLayout(range("2026-11-09", "2026-11-20"), window)).toEqual({ leftPercent: 80, widthPercent: 20 });
  });

  it("renvoie null pour un groupe hors de la période", () => {
    expect(barLayout(range("2026-10-01", "2026-10-31"), window)).toBeNull();
    expect(barLayout(range("2026-11-11", "2026-11-20"), window)).toBeNull();
  });

  it("renvoie null pour des dates inversées", () => {
    expect(barLayout(range("2026-11-07", "2026-11-03"), window)).toBeNull();
  });

  it("ignore l'heure : seul le jour compte", () => {
    const g = { start: new Date("2026-11-03T00:00:00Z"), end: new Date("2026-11-07T00:00:00Z") };
    expect(barLayout(g, window)).toEqual(barLayout(range("2026-11-03", "2026-11-07"), window));
  });
});

describe("dayInTimeZone", () => {
  it("donne le jour calendaire local, pas le jour UTC", () => {
    // 23 h 30 UTC le 4 nov. : déjà le 5 à Paris (UTC+1), encore le 4 à Lomé (UTC+0).
    const now = new Date("2026-11-04T23:30:00Z");
    expect(dayInTimeZone(now, "Africa/Lome")).toBe(dayNumber(d("2026-11-04")));
    expect(dayInTimeZone(now, "Europe/Paris")).toBe(dayNumber(d("2026-11-05")));
    expect(dayInTimeZone(new Date("2026-11-05T02:00:00Z"), "America/New_York")).toBe(dayNumber(d("2026-11-04")));
  });

  it("dateOfDay est l'inverse de dayNumber", () => {
    expect(dateOfDay(dayNumber(d("2026-11-10")))).toEqual(d("2026-11-10"));
  });
});
