import { describe, expect, it } from "vitest";
import { planPromo, studentAgenda } from "@/lib/planning";
import { exampleInput } from "@/lib/planning/__tests__/fixtures";

const plan = planPromo(exampleInput());
const ids = <T extends { taskId: string }>(items: T[]) => items.map((i) => i.taskId);

describe("studentAgenda", () => {
  it("étudiant sans groupe : agenda vide", () => {
    expect(studentAgenda(plan, "dan", new Set())).toEqual({ tasks: [], meetings: [], conflicts: [] });
  });

  it("étudiant sans tâche : rien de planifié, mais les conflits de son groupe", () => {
    const agenda = studentAgenda(plan, "dan", new Set(["A"]));
    expect(agenda.tasks).toEqual([]);
    expect(agenda.meetings).toEqual([]);
    expect(ids(agenda.conflicts)).toEqual(["A3", "A4", "A5"]);
  });

  it("voit les conflits de tous ses groupes, y compris les tâches non assignées", () => {
    const alice = studentAgenda(plan, "alice", new Set(["A", "B"]));
    expect(ids(alice.tasks)).toEqual(["B1", "A1", "A2"]);
    expect(ids(alice.meetings)).toEqual(["B1", "A2"]);
    expect(alice.conflicts.map((c) => `${c.taskId}:${c.kind}`)).toEqual([
      "A3:deadline_missed",
      "A4:unassigned",
      "A5:blocked_dependency",
    ]);

    const chloe = studentAgenda(plan, "chloe", new Set(["B"]));
    expect(ids(chloe.tasks)).toEqual(["B1", "B2"]);
    expect(chloe.conflicts).toEqual([]);
  });

  it("ne montre rien d'un groupe dont l'étudiant n'est pas membre (§8)", () => {
    const agenda = studentAgenda(plan, "alice", new Set(["A"]));
    expect(ids(agenda.tasks)).toEqual(["A1", "A2"]);
    expect(ids(agenda.meetings)).toEqual(["A2"]);
    expect(agenda.conflicts.every((c) => c.groupId === "A")).toBe(true);
  });
});
