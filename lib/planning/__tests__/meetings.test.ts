import { describe, expect, it } from "vitest";
import type { Occupancy } from "@/lib/planning/assign";
import { planPromo } from "@/lib/planning";
import { firstCommonFreeDay } from "@/lib/planning/meetings";
import { group, input, J, task } from "@/lib/planning/__tests__/fixtures";

describe("réunions", () => {
  it("une tâche à un seul assigné ne génère pas de réunion (§11 n°11)", () => {
    const plan = planPromo(input([group("G", 0, 10)], [task("solo", "G", 3, { assignees: ["alice"] })]));
    expect(plan.meetings).toEqual([]);
  });

  it("une tâche à deux assignés ou plus génère une réunion, le premier jour commun libre", () => {
    const plan = planPromo(
      input(
        [group("G", 0, 10)],
        [
          task("pair", "G", 2, { assignees: ["bob", "alice"] }),
          task("trio", "G", 1, { assignees: ["alice", "bob", "chloe"], deps: ["pair"] }),
        ],
      ),
    );
    expect(plan.meetings).toEqual([
      { taskId: "pair", groupId: "G", day: J(0), attendeeIds: ["alice", "bob"] },
      { taskId: "trio", groupId: "G", day: J(2), attendeeIds: ["alice", "bob", "chloe"] },
    ]);
  });
});

describe("firstCommonFreeDay", () => {
  const occupancy: Occupancy = new Map([
    ["alice", new Map([[J(0), "x"], [J(3), "T"]])],
    ["bob", new Map([[J(1), "y"]])],
  ]);

  it("premier jour où aucun participant n'a une autre tâche", () => {
    expect(firstCommonFreeDay(occupancy, ["alice", "bob"], J(0), J(5), "T")).toBe(J(2));
  });

  it("un jour occupé par la tâche elle-même compte comme libre", () => {
    expect(firstCommonFreeDay(occupancy, ["alice"], J(3), J(3), "T")).toBe(J(3));
    expect(firstCommonFreeDay(occupancy, ["alice"], J(3), J(3), "other")).toBeNull();
  });

  it("null si aucun jour commun dans la fenêtre", () => {
    expect(firstCommonFreeDay(occupancy, ["alice", "bob"], J(0), J(1), "T")).toBeNull();
  });
});
