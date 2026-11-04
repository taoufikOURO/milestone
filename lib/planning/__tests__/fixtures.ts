// Fabriques partagées par les tests de lib/planning (pas un fichier de test).

import { dayNumber } from "@/lib/domain/timeline";
import type { Day, PlanningGroup, PlanningInput, PlanningStatus, PlanningTask } from "@/lib/planning/types";

/** J0 = 10 novembre 2026. */
export const J0 = dayNumber(new Date("2026-11-10T00:00:00.000Z"));
export const J = (offset: number): Day => J0 + offset;

export const group = (id: string, start: number, end: number, marginPercent = 0): PlanningGroup => ({
  id,
  startDay: J(start),
  endDay: J(end),
  marginPercent,
});

export const task = (
  id: string,
  groupId: string,
  durationDays: number,
  opts: { assignees?: string[]; deps?: string[]; status?: PlanningStatus; createdAt?: number } = {},
): PlanningTask => ({
  id,
  groupId,
  durationDays,
  status: opts.status ?? "todo",
  assigneeIds: opts.assignees ?? [],
  dependsOnIds: opts.deps ?? [],
  createdAt: opts.createdAt ?? 0,
});

export const input = (
  groups: PlanningGroup[],
  tasks: PlanningTask[],
  today: Day = J(-6),
): PlanningInput => ({ today, groups, tasks });

/**
 * Exemple de la conception : aujourd'hui = 4 nov. (J−6).
 * A « Site » J0 → J10, marge 20 % ; B « Hackathon » J2 → J7, marge 50 %.
 * Alice est dans A et B, Bob dans A, Chloé dans B.
 */
export function exampleInput(): PlanningInput {
  const A = group("A", 0, 10, 20);
  const B = group("B", 2, 7, 50);
  return input(
    [A, B],
    [
      task("A1", "A", 2, { assignees: ["alice"], createdAt: 1 }),
      task("A2", "A", 3, { assignees: ["alice", "bob"], deps: ["A1"], createdAt: 2 }),
      task("A3", "A", 1, { assignees: ["bob"], deps: ["A2"], createdAt: 3 }),
      task("A4", "A", 2, { createdAt: 4 }),
      task("A5", "A", 1, { assignees: ["bob"], deps: ["A3", "A4"], createdAt: 5 }),
      task("B1", "B", 1, { assignees: ["alice", "chloe"], createdAt: 6 }),
      task("B2", "B", 2, { assignees: ["chloe"], deps: ["B1"], createdAt: 7 }),
    ],
  );
}

/** Générateur pseudo-aléatoire à graine fixe (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Promo aléatoire sans cycle : chaque tâche ne dépend que de tâches plus
 * anciennes de son groupe. Quelques tâches terminées ou en cours.
 */
export function randomInput(rand: () => number, students = ["s1", "s2", "s3", "s4"]): PlanningInput {
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const groups: PlanningGroup[] = [];
  const tasks: PlanningTask[] = [];
  const groupCount = int(1, 3);
  for (let g = 0; g < groupCount; g++) {
    const start = int(0, 10);
    groups.push(group(`g${g}`, start, start + int(5, 30), int(0, 100)));
    const ids: string[] = [];
    const count = int(1, 8);
    for (let i = 0; i < count; i++) {
      const id = `g${g}t${i}`;
      const deps = ids.filter(() => rand() < 0.3);
      const assignees = students.filter(() => rand() < 0.4);
      const r = rand();
      const status: PlanningStatus = r < 0.1 ? "done" : r < 0.2 ? "in_progress" : "todo";
      tasks.push(task(id, `g${g}`, int(1, 5), { assignees, deps, status, createdAt: int(0, 3) }));
      ids.push(id);
    }
  }
  return input(groups, tasks, J(int(-3, 5)));
}
