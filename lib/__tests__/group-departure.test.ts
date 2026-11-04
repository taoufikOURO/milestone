import { describe, expect, it } from "vitest";
import { isValidSuccessor, planAssignmentRelease, planGroupDeparture } from "@/lib/group-departure";

describe("transfert du rôle de chef", () => {
  const members = ["chef", "a", "b"];

  it("refuse le départ du chef sans successeur (critère 6)", () => {
    expect(planGroupDeparture({ leaverId: "chef", leaverRole: "leader", memberIds: members })).toEqual({
      ok: false,
      error: "leader_successor_required",
    });
    expect(
      planGroupDeparture({ leaverId: "chef", leaverRole: "leader", memberIds: members, successorId: null }),
    ).toMatchObject({ ok: false, error: "leader_successor_required" });
  });

  it("refuse un successeur hors du groupe ou le chef lui-même", () => {
    for (const successorId of ["inconnu", "chef"]) {
      expect(planGroupDeparture({ leaverId: "chef", leaverRole: "leader", memberIds: members, successorId })).toEqual({
        ok: false,
        error: "invalid_successor",
      });
    }
  });

  it("le successeur, membre du groupe, devient chef", () => {
    expect(
      planGroupDeparture({ leaverId: "chef", leaverRole: "leader", memberIds: members, successorId: "b" }),
    ).toEqual({ ok: true, kind: "leave", newLeaderId: "b" });
  });

  it("un membre part sans successeur ; un successeur fourni est ignoré", () => {
    expect(planGroupDeparture({ leaverId: "a", leaverRole: "member", memberIds: members })).toEqual({
      ok: true,
      kind: "leave",
      newLeaderId: null,
    });
    expect(
      planGroupDeparture({ leaverId: "a", leaverRole: "member", memberIds: members, successorId: "b" }),
    ).toEqual({ ok: true, kind: "leave", newLeaderId: null });
  });

  it("le dernier membre supprime le groupe, sans successeur", () => {
    expect(planGroupDeparture({ leaverId: "chef", leaverRole: "leader", memberIds: ["chef"] })).toEqual({
      ok: true,
      kind: "delete_group",
    });
  });

  it("isValidSuccessor : autre membre du groupe uniquement", () => {
    expect(isValidSuccessor("chef", members, "a")).toBe(true);
    expect(isValidSuccessor("chef", members, "chef")).toBe(false);
    expect(isValidSuccessor("chef", members, "x")).toBe(false);
  });
});

describe("non-assignation au départ d'un membre", () => {
  it("tâche seule → non assignée ; tâche partagée → reste aux autres", () => {
    const plan = planAssignmentRelease(
      [
        { id: "seule", assigneeIds: ["p"] },
        { id: "a-deux", assigneeIds: ["p", "a"] },
        { id: "a-trois", assigneeIds: ["p", "a", "b"] },
        { id: "autre", assigneeIds: ["a"] },
        { id: "vide", assigneeIds: [] },
      ],
      "p",
    );
    expect(plan.releasedTaskIds).toEqual(["seule", "a-deux", "a-trois"]);
    expect(plan.unassignedTaskIds).toEqual(["seule"]);
    // Plus qu'un assigné (ou aucun) : la réunion n'a plus lieu d'être (§4.5).
    expect(plan.meetingObsoleteTaskIds).toEqual(["seule", "a-deux"]);
  });

  it("ne touche à rien si le partant n'a aucune tâche", () => {
    expect(planAssignmentRelease([{ id: "t", assigneeIds: ["a", "b"] }], "p")).toEqual({
      releasedTaskIds: [],
      unassignedTaskIds: [],
      meetingObsoleteTaskIds: [],
    });
  });
});
