import { describe, expect, it } from "vitest";
import { computeCpm, prepareTasks } from "@/lib/planning/cpm";
import { priorityOrder } from "@/lib/planning/prioritize";
import type { PlanningInput } from "@/lib/planning/types";
import { group, input, J, randomInput, seeded, task } from "@/lib/planning/__tests__/fixtures";

function orderOf(planning: PlanningInput): string[] {
  const tasks = prepareTasks(planning);
  return priorityOrder(tasks, computeCpm(tasks).tail).map((t) => t.id);
}

describe("priorityOrder", () => {
  it("la deadline la plus proche passe d'abord, entre groupes", () => {
    const order = orderOf(
      input([group("late", 0, 30), group("soon", 0, 5)], [task("big", "late", 20), task("small", "soon", 1)]),
    );
    expect(order).toEqual(["small", "big"]);
  });

  it("à deadline égale, le plus grand tail passe d'abord", () => {
    const order = orderOf(
      input(
        [group("G", 0, 20), group("H", 0, 20)],
        [task("short", "G", 2), task("long", "H", 3), task("chain", "G", 1), task("next", "G", 3, { deps: ["chain"] })],
      ),
    );
    // tail : chain 4, long 3, next 3, short 2 ; long et next départagés par id.
    expect(order).toEqual(["chain", "long", "next", "short"]);
  });

  it("égalité totale : createdAt, puis id", () => {
    const order = orderOf(
      input(
        [group("G", 0, 20)],
        [
          task("c", "G", 2, { createdAt: 1 }),
          task("b", "G", 2, { createdAt: 2 }),
          task("a", "G", 2, { createdAt: 2 }),
        ],
      ),
    );
    expect(order).toEqual(["c", "a", "b"]);
  });

  it("une tâche en cours passe en tête, quelle que soit sa deadline", () => {
    const order = orderOf(
      input(
        [group("soon", 0, 3), group("late", 0, 30)],
        [task("urgent", "soon", 3), task("started", "late", 1, { status: "in_progress" })],
        J(0),
      ),
    );
    expect(order).toEqual(["started", "urgent"]);
  });

  it("l'ordre est topologique sur des DAG aléatoires (graine fixe)", () => {
    const rand = seeded(20261104);
    for (let run = 0; run < 300; run++) {
      const tasks = prepareTasks(randomInput(rand));
      const position = new Map(priorityOrder(tasks, computeCpm(tasks).tail).map((t, i) => [t.id, i]));
      expect(position.size).toBe(tasks.length);
      for (const t of tasks) {
        for (const dep of t.dependsOnIds) expect(position.get(dep)!).toBeLessThan(position.get(t.id)!);
      }
    }
  });
});
