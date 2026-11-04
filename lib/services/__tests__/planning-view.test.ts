import { describe, expect, it } from "vitest";
import type { Conflict, DeadlineCause, Plan } from "@/lib/planning";
import { J } from "@/lib/planning/__tests__/fixtures";
import { meetingForTask, meetingsForGroup, meetingsForStudent } from "@/lib/services/meeting";
import {
  calendarRange,
  daySpan,
  describeConflict,
  projectGroupCalendar,
  projectPersonalCalendar,
  type PlanCatalog,
} from "@/lib/services/planning-view";

// Plan fabriqué à la main (pas de planPromo) : on ne teste que la projection.
// A : J0 → J10 (alice, bob) ; B : J2 → J7 (alice, chloe).
const plan: Plan = {
  scheduled: [
    { taskId: "B1", groupId: "B", assigneeIds: ["alice", "chloe"], effectiveDays: 2, earliestStart: J(2), start: J(2), end: J(3), deadline: J(7), daysLate: 0 },
    { taskId: "A1", groupId: "A", assigneeIds: ["alice"], effectiveDays: 3, earliestStart: J(0), start: J(4), end: J(6), deadline: J(10), daysLate: 0 },
    { taskId: "A2", groupId: "A", assigneeIds: ["alice", "bob"], effectiveDays: 4, earliestStart: J(3), start: J(7), end: J(10), deadline: J(10), daysLate: 0 },
    { taskId: "A3", groupId: "A", assigneeIds: ["bob"], effectiveDays: 2, earliestStart: J(7), start: J(11), end: J(12), deadline: J(10), daysLate: 2 },
  ],
  meetings: [
    { taskId: "B1", groupId: "B", day: J(2), attendeeIds: ["alice", "chloe"] },
    { taskId: "A2", groupId: "A", day: J(7), attendeeIds: ["alice", "bob"] },
  ],
  conflicts: [
    { kind: "deadline_missed", taskId: "A3", groupId: "A", end: J(12), deadline: J(10), daysLate: 2, cause: "workload" },
    { kind: "unassigned", taskId: "A4", groupId: "A" },
    { kind: "blocked_dependency", taskId: "A5", groupId: "A", blockedBy: ["A4"] },
    { kind: "unassigned", taskId: "B3", groupId: "B" },
  ],
};

const person = (id: string, firstName: string) => ({ id, username: id, firstName, lastName: "Test" });
const catalog: PlanCatalog = {
  groups: new Map([
    ["A", { id: "A", name: "Site", startDay: J(0), endDay: J(10) }],
    ["B", { id: "B", name: "Hackathon", startDay: J(2), endDay: J(7) }],
  ]),
  tasks: new Map(
    (
      [
        ["A1", "Maquettes", "done"],
        ["A2", "Intégration", "in_progress"],
        ["A3", "Recette", "todo"],
        ["A4", "Contenus", "todo"],
        ["A5", "Mise en ligne", "todo"],
        ["B1", "Idée", "todo"],
        ["B3", "Pitch", "todo"],
      ] as const
    ).map(([id, title, status]) => [id, { title, status }]),
  ),
  people: new Map([
    ["alice", person("alice", "Alice")],
    ["bob", person("bob", "Bob")],
    ["chloe", person("chloe", "Chloé")],
  ]),
};
const TODAY = J(-1);

describe("projectGroupCalendar", () => {
  const view = projectGroupCalendar(plan, "A", catalog, TODAY)!;

  it("ne garde que les tâches, réunions et conflits du groupe", () => {
    expect(view.group).toEqual({ id: "A", name: "Site", startDay: J(0), endDay: J(10) });
    expect(view.tasks.map((t) => t.id)).toEqual(["A1", "A2", "A3"]);
    expect(view.meetings.map((m) => m.taskId)).toEqual(["A2"]);
    expect(view.conflicts.map((c) => c.taskId)).toEqual(["A3", "A4", "A5"]);
  });

  it("ajoute titres, assignés, réunion et retard", () => {
    expect(view.tasks[1]).toMatchObject({
      title: "Intégration",
      status: "in_progress",
      groupName: "Site",
      assignees: [catalog.people.get("alice"), catalog.people.get("bob")],
      start: J(7),
      end: J(10),
      meetingDay: J(7),
      daysLate: 0,
    });
    expect(view.tasks[0].meetingDay).toBeNull();
    expect(view.tasks[2].daysLate).toBe(2);
    expect(view.meetings[0]).toMatchObject({ taskTitle: "Intégration", day: J(7), attendees: [{ id: "alice" }, { id: "bob" }] });
  });

  it("est identique quel que soit l'étudiant (aucun paramètre d'étudiant)", () => {
    expect(projectGroupCalendar(plan, "A", catalog, TODAY)).toEqual(view);
  });

  it("renvoie null pour un groupe hors du catalogue", () => {
    expect(projectGroupCalendar(plan, "Z", catalog, TODAY)).toBeNull();
  });
});

describe("projectPersonalCalendar", () => {
  it("bob (A) : ses tâches et réunions, et tous les conflits de A, non assignées comprises", () => {
    const view = projectPersonalCalendar(plan, "bob", new Set(["A"]), catalog, TODAY);
    expect(view.groups.map((g) => g.id)).toEqual(["A"]);
    expect(view.tasks.map((t) => t.id)).toEqual(["A2", "A3"]);
    expect(view.meetings.map((m) => m.taskId)).toEqual(["A2"]);
    expect(view.conflicts.map((c) => c.taskId)).toEqual(["A3", "A4", "A5"]);
  });

  it("alice (A et B) : ses deux groupes sur un seul calendrier", () => {
    const view = projectPersonalCalendar(plan, "alice", new Set(["A", "B"]), catalog, TODAY);
    // Groupes par deadline : B (J7) puis A (J10).
    expect(view.groups.map((g) => g.id)).toEqual(["B", "A"]);
    expect(view.tasks.map((t) => [t.id, t.groupName])).toEqual([
      ["B1", "Hackathon"],
      ["A1", "Site"],
      ["A2", "Site"],
    ]);
    expect(view.meetings.map((m) => m.taskId)).toEqual(["B1", "A2"]);
    expect(view.conflicts.map((c) => c.taskId)).toEqual(["A3", "A4", "A5", "B3"]);
  });

  it("ne montre rien d'un groupe dont l'étudiant n'est plus membre", () => {
    const view = projectPersonalCalendar(plan, "alice", new Set(["A"]), catalog, TODAY);
    expect(view.tasks.every((t) => t.groupId === "A")).toBe(true);
    expect(view.meetings.map((m) => m.taskId)).toEqual(["A2"]);
    expect(view.conflicts.some((c) => c.groupId === "B")).toBe(false);
  });
});

describe("réunions", () => {
  it("une tâche à un seul assigné n'a pas de réunion", () => {
    expect(meetingForTask(plan, "A1")).toBeNull();
    expect(meetingForTask(plan, "A2")).toMatchObject({ day: J(7) });
  });

  it("par groupe et par étudiant", () => {
    expect(meetingsForGroup(plan, "B").map((m) => m.taskId)).toEqual(["B1"]);
    expect(meetingsForStudent(plan, "chloe", new Set(["B"])).map((m) => m.taskId)).toEqual(["B1"]);
    expect(meetingsForStudent(plan, "chloe", new Set())).toEqual([]);
  });
});

describe("describeConflict", () => {
  const titleOf = (id: string) => catalog.tasks.get(id)?.title ?? id;
  const CODES = ["past_deadline", "exceeds_window", "dependency_chain", "workload", "unassigned", "blocked_dependency"];
  const missed = (cause: DeadlineCause): Conflict => ({
    kind: "deadline_missed",
    taskId: "A3",
    groupId: "A",
    end: J(12),
    deadline: J(10),
    daysLate: 2,
    cause,
  });

  it("donne un texte lisible par cause, jamais le code brut", () => {
    const conflicts: Conflict[] = [
      missed("past_deadline"),
      missed("exceeds_window"),
      missed("dependency_chain"),
      missed("workload"),
      { kind: "unassigned", taskId: "A4", groupId: "A" },
      { kind: "blocked_dependency", taskId: "A5", groupId: "A", blockedBy: ["A4"] },
      { kind: "dependency_cycle", taskId: "A5", groupId: "A" },
    ];
    const texts = conflicts.map((c) => describeConflict(c, titleOf));
    for (const { title, detail } of texts) {
      for (const code of CODES) expect(`${title} ${detail}`).not.toContain(code);
    }
    // Quatre explications distinctes pour les quatre causes de retard.
    expect(new Set(texts.slice(0, 4).map((t) => t.detail)).size).toBe(4);
    expect(texts[3].detail).toContain("2 jours après la deadline");
    expect(texts[4].title).toBe("Tâche non assignée");
    expect(texts[5].detail).toContain("« Contenus »");
  });
});

describe("calendarRange et daySpan", () => {
  it("couvre groupes, tâches et réunions", () => {
    const view = projectGroupCalendar(plan, "A", catalog, TODAY)!;
    expect(calendarRange(view)).toEqual({ from: J(0), to: J(12) });
  });

  it("place un intervalle en %, bornes incluses, rogné à la période", () => {
    const range = { from: J(0), to: J(9) };
    expect(daySpan(J(0), J(0), range)).toEqual({ left: 0, width: 10 });
    expect(daySpan(J(5), J(14), range)).toEqual({ left: 50, width: 50 });
  });
});
