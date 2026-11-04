import { describe, expect, it } from "vitest";
import { groupProgress } from "@/lib/domain/progress";

describe("groupProgress", () => {
  it("vaut 0 % pour un groupe sans tâche", () => {
    expect(groupProgress([])).toBe(0);
  });

  it("pondère par la durée saisie", () => {
    // 3 jours terminés sur 4 : 75 %, et non 50 % (une tâche sur deux).
    expect(
      groupProgress([
        { durationDays: 3, status: "done" },
        { durationDays: 1, status: "todo" },
      ]),
    ).toBe(75);
  });

  it("compte une tâche en cours pour 0 %", () => {
    expect(
      groupProgress([
        { durationDays: 2, status: "done" },
        { durationDays: 2, status: "in_progress" },
      ]),
    ).toBe(50);
    expect(groupProgress([{ durationDays: 5, status: "in_progress" }])).toBe(0);
  });

  it("arrondit à l'entier et atteint 100 %", () => {
    expect(
      groupProgress([
        { durationDays: 1, status: "done" },
        { durationDays: 2, status: "todo" },
      ]),
    ).toBe(33);
    expect(groupProgress([{ durationDays: 4, status: "done" }])).toBe(100);
  });
});
