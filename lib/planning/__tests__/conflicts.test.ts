import { describe, expect, it } from "vitest";
import { planPromo } from "@/lib/planning";
import { group, input, J, task } from "@/lib/planning/__tests__/fixtures";

describe("conflits", () => {
  it("aucun conflit pour un plan faisable", () => {
    const plan = planPromo(
      input(
        [group("G", 0, 10)],
        [task("a", "G", 2, { assignees: ["alice"] }), task("b", "G", 3, { assignees: ["alice", "bob"], deps: ["a"] })],
      ),
    );
    expect(plan.conflicts).toEqual([]);
  });

  it("deadline_missed / past_deadline : la deadline est déjà passée", () => {
    const plan = planPromo(input([group("G", -10, -2)], [task("a", "G", 1, { assignees: ["alice"] })], J(0)));
    expect(plan.scheduled[0]).toMatchObject({ start: J(0), end: J(0), daysLate: 2 });
    expect(plan.conflicts).toEqual([
      { kind: "deadline_missed", taskId: "a", groupId: "G", end: J(0), deadline: J(-2), daysLate: 2, cause: "past_deadline" },
    ]);
  });

  it("deadline_missed / exceeds_window : 5 j à 20 % = 6 j dans une fenêtre de 5 j", () => {
    const plan = planPromo(input([group("G", 0, 4, 20)], [task("a", "G", 5, { assignees: ["alice"] })]));
    expect(plan.scheduled[0]).toMatchObject({ start: J(0), end: J(5) });
    expect(plan.conflicts).toEqual([
      { kind: "deadline_missed", taskId: "a", groupId: "G", end: J(5), deadline: J(4), daysLate: 1, cause: "exceeds_window" },
    ]);
  });

  it("deadline_missed / dependency_chain : la chaîne dépasse, même sans charge", () => {
    const plan = planPromo(
      input(
        [group("G", 0, 4)],
        [task("a", "G", 3, { assignees: ["alice"] }), task("b", "G", 3, { assignees: ["bob"], deps: ["a"] })],
      ),
    );
    expect(plan.conflicts).toEqual([
      { kind: "deadline_missed", taskId: "b", groupId: "G", end: J(5), deadline: J(4), daysLate: 1, cause: "dependency_chain" },
    ]);
  });

  it("deadline_missed / workload : la charge d'un autre groupe repousse la tâche", () => {
    const plan = planPromo(
      input(
        [group("B", 0, 2), group("A", 0, 4)],
        [task("b", "B", 3, { assignees: ["alice"] }), task("a", "A", 3, { assignees: ["alice"] })],
      ),
    );
    expect(plan.conflicts).toEqual([
      { kind: "deadline_missed", taskId: "a", groupId: "A", end: J(5), deadline: J(4), daysLate: 1, cause: "workload" },
    ]);
  });

  it("unassigned : signalée, pas planifiée", () => {
    const plan = planPromo(input([group("G", 0, 10)], [task("a", "G", 2)]));
    expect(plan.scheduled).toEqual([]);
    expect(plan.conflicts).toEqual([{ kind: "unassigned", taskId: "a", groupId: "G" }]);
  });

  it("blocked_dependency : blocage transitif sur deux niveaux, avec la bonne racine", () => {
    const plan = planPromo(
      input(
        [group("G", 0, 20)],
        [
          task("root", "G", 1, { createdAt: 1 }),
          task("mid", "G", 1, { assignees: ["alice"], deps: ["root"], createdAt: 2 }),
          task("leaf", "G", 1, { assignees: ["alice"], deps: ["mid"], createdAt: 3 }),
          task("free", "G", 1, { assignees: ["bob"], createdAt: 4 }),
        ],
      ),
    );
    expect(plan.scheduled.map((t) => t.taskId)).toEqual(["free"]);
    expect(plan.conflicts).toEqual([
      { kind: "unassigned", taskId: "root", groupId: "G" },
      { kind: "blocked_dependency", taskId: "mid", groupId: "G", blockedBy: ["root"] },
      { kind: "blocked_dependency", taskId: "leaf", groupId: "G", blockedBy: ["root"] },
    ]);
  });

  it("blocked_dependency : un intermédiaire sans assigné ajoute sa propre racine", () => {
    const plan = planPromo(
      input(
        [group("G", 0, 20)],
        [
          task("root", "G", 1, { createdAt: 1 }),
          task("mid", "G", 1, { deps: ["root"], createdAt: 2 }),
          task("leaf", "G", 1, { assignees: ["alice"], deps: ["mid"], createdAt: 3 }),
        ],
      ),
    );
    expect(plan.conflicts).toEqual([
      { kind: "unassigned", taskId: "root", groupId: "G" },
      { kind: "unassigned", taskId: "mid", groupId: "G" },
      { kind: "blocked_dependency", taskId: "mid", groupId: "G", blockedBy: ["root"] },
      { kind: "blocked_dependency", taskId: "leaf", groupId: "G", blockedBy: ["root", "mid"] },
    ]);
  });

  it("dependency_cycle : défensif, l'aval du cycle est bloqué par ses membres", () => {
    const plan = planPromo(
      input(
        [group("G", 0, 20)],
        [
          task("a", "G", 1, { assignees: ["alice"], deps: ["b"], createdAt: 1 }),
          task("b", "G", 1, { assignees: ["alice"], deps: ["a"], createdAt: 2 }),
          task("c", "G", 1, { assignees: ["alice"], deps: ["b"], createdAt: 3 }),
          task("ok", "G", 1, { assignees: ["alice"], createdAt: 4 }),
        ],
      ),
    );
    expect(plan.scheduled.map((t) => t.taskId)).toEqual(["ok"]);
    expect(plan.conflicts).toEqual([
      { kind: "dependency_cycle", taskId: "a", groupId: "G" },
      { kind: "dependency_cycle", taskId: "b", groupId: "G" },
      { kind: "blocked_dependency", taskId: "c", groupId: "G", blockedBy: ["b"] },
    ]);
  });
});
