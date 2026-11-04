import { describe, expect, it } from "vitest";
import { findSlot, type Occupancy } from "@/lib/planning/assign";
import { planPromo } from "@/lib/planning";
import type { Plan, PlanningInput } from "@/lib/planning/types";
import { group, input, J, randomInput, seeded, task } from "@/lib/planning/__tests__/fixtures";

const spans = (plan: Plan) =>
  Object.fromEntries(plan.scheduled.map((t) => [t.taskId, [t.start - J(0), t.end - J(0)]]));

describe("findSlot", () => {
  it("saute au lendemain du dernier jour occupé de la fenêtre", () => {
    const occupancy: Occupancy = new Map([
      ["alice", new Map([[J(1), "x"], [J(4), "y"]])],
      ["bob", new Map([[J(6), "z"]])],
    ]);
    expect(findSlot(occupancy, ["alice"], J(0), 2)).toBe(J(2));
    expect(findSlot(occupancy, ["alice"], J(0), 3)).toBe(J(5));
    expect(findSlot(occupancy, ["alice", "bob"], J(0), 3)).toBe(J(7));
    expect(findSlot(occupancy, ["carol"], J(0), 10)).toBe(J(0));
  });
});

describe("placeTasks (via planPromo)", () => {
  it("met en file les tâches d'un étudiant, sans chevauchement", () => {
    const plan = planPromo(
      input([group("G", 0, 20)], [task("two", "G", 2, { assignees: ["alice"] }), task("three", "G", 3, { assignees: ["alice"] })]),
    );
    expect(spans(plan)).toEqual({ three: [0, 2], two: [3, 4] });
  });

  it("une tâche multi-assignée attend que tous ses assignés soient libres", () => {
    const plan = planPromo(
      input(
        [group("soon", 0, 3), group("G", 0, 20)],
        [task("busy", "soon", 3, { assignees: ["bob"] }), task("pair", "G", 2, { assignees: ["alice", "bob"] })],
      ),
    );
    expect(spans(plan)).toEqual({ busy: [0, 2], pair: [3, 4] });
  });

  it("un trou trop court reste vide, puis une tâche courte de priorité plus faible le remplit", () => {
    const plan = planPromo(
      input(
        [group("B", 2, 3), group("A", 0, 20)],
        [
          task("b", "B", 2, { assignees: ["alice"] }),
          task("long", "A", 3, { assignees: ["alice"] }),
          task("short", "A", 2, { assignees: ["alice"] }),
        ],
      ),
    );
    expect(spans(plan)).toEqual({ b: [2, 3], long: [4, 6], short: [0, 1] });
  });

  it("ne démarre jamais avant la fin des dépendances, même si l'assigné est libre (§11 n°10)", () => {
    const plan = planPromo(
      input(
        [group("G", 0, 20)],
        [task("a", "G", 2, { assignees: ["alice"] }), task("b", "G", 1, { assignees: ["bob"], deps: ["a"] })],
      ),
    );
    expect(spans(plan)).toEqual({ a: [0, 1], b: [2, 2] });
  });

  it("une dépendance retardée par la charge retarde aussi sa dépendante", () => {
    const plan = planPromo(
      input(
        [group("soon", 0, 2), group("G", 0, 20)],
        [
          task("x", "soon", 3, { assignees: ["alice"] }),
          task("a", "G", 2, { assignees: ["alice"] }),
          task("b", "G", 1, { assignees: ["bob"], deps: ["a"] }),
        ],
      ),
    );
    expect(spans(plan)).toEqual({ x: [0, 2], a: [3, 4], b: [5, 5] });
  });

  it("une tâche en cours passe en tête de file de ses assignés, à partir d'aujourd'hui", () => {
    const plan = planPromo(
      input(
        [group("soon", 0, 3), group("late", 0, 30)],
        [
          task("urgent", "soon", 2, { assignees: ["alice"] }),
          task("started", "late", 2, { assignees: ["alice"], status: "in_progress" }),
        ],
        J(0),
      ),
    );
    expect(spans(plan)).toEqual({ started: [0, 1], urgent: [2, 3] });
  });

  it("n'inclut pas les tâches terminées", () => {
    const plan = planPromo(input([group("G", 0, 20)], [task("done", "G", 3, { assignees: ["alice"], status: "done" })]));
    expect(plan.scheduled).toEqual([]);
  });

  it("invariant : jamais deux tâches le même jour pour un étudiant, dépendances respectées", () => {
    const rand = seeded(42);
    for (let run = 0; run < 300; run++) {
      const planning: PlanningInput = randomInput(rand);
      const plan = planPromo(planning);
      const byId = new Map(plan.scheduled.map((t) => [t.taskId, t]));
      const days = new Map<string, Set<number>>();
      for (const t of plan.scheduled) {
        for (const student of t.assigneeIds) {
          const taken = days.get(student) ?? new Set<number>();
          for (let d = t.start; d <= t.end; d++) {
            expect(taken.has(d)).toBe(false);
            taken.add(d);
          }
          days.set(student, taken);
        }
      }
      for (const source of planning.tasks) {
        const placed = byId.get(source.id);
        if (!placed || source.status === "in_progress") continue;
        for (const depId of source.dependsOnIds) {
          const dep = byId.get(depId);
          if (dep) expect(placed.start).toBeGreaterThan(dep.end);
        }
      }
    }
  });
});
