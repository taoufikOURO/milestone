import { describe, expect, it } from "vitest";
import { planPromo } from "@/lib/planning";
import type { PlanningInput } from "@/lib/planning/types";
import { exampleInput, J, seeded } from "@/lib/planning/__tests__/fixtures";

describe("planPromo : exemple à deux groupes qui se chevauchent", () => {
  const plan = planPromo(exampleInput());

  it("place les tâches comme dans la conception", () => {
    expect(plan.scheduled.map((t) => [t.taskId, t.start - J(0), t.end - J(0), t.daysLate])).toEqual([
      ["B1", 2, 3, 0],
      ["B2", 4, 6, 0],
      ["A1", 4, 6, 0],
      ["A2", 7, 10, 0],
      ["A3", 11, 12, 2],
    ]);
    expect(plan.scheduled.find((t) => t.taskId === "A1")).toMatchObject({
      assigneeIds: ["alice"],
      effectiveDays: 3,
      earliestStart: J(0),
      deadline: J(10),
    });
    expect(plan.scheduled.find((t) => t.taskId === "A3")!.earliestStart).toBe(J(7));
  });

  it("propose une réunion pour B1 et A2", () => {
    expect(plan.meetings).toEqual([
      { taskId: "B1", groupId: "B", day: J(2), attendeeIds: ["alice", "chloe"] },
      { taskId: "A2", groupId: "A", day: J(7), attendeeIds: ["alice", "bob"] },
    ]);
  });

  it("signale A3 en retard (workload), A4 non assignée, A5 bloquée par A4", () => {
    expect(plan.conflicts).toEqual([
      { kind: "deadline_missed", taskId: "A3", groupId: "A", end: J(12), deadline: J(10), daysLate: 2, cause: "workload" },
      { kind: "unassigned", taskId: "A4", groupId: "A" },
      { kind: "blocked_dependency", taskId: "A5", groupId: "A", blockedBy: ["A4"] },
    ]);
  });
});

describe("planPromo : déterminisme", () => {
  function shuffled(planning: PlanningInput, rand: () => number): PlanningInput {
    const shuffle = <T>(items: readonly T[]): T[] => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };
    return {
      today: planning.today,
      groups: shuffle(planning.groups),
      tasks: shuffle(planning.tasks).map((t) => ({
        ...t,
        assigneeIds: shuffle(t.assigneeIds),
        dependsOnIds: shuffle(t.dependsOnIds),
      })),
    };
  }

  it("des entrées mélangées donnent une sortie identique", () => {
    const rand = seeded(7);
    const reference = planPromo(exampleInput());
    for (let run = 0; run < 50; run++) {
      expect(planPromo(shuffled(exampleInput(), rand))).toEqual(reference);
    }
  });

  it("n'altère pas son entrée", () => {
    const planning = exampleInput();
    const copy = structuredClone(planning);
    planPromo(planning);
    expect(planning).toEqual(copy);
  });
});
