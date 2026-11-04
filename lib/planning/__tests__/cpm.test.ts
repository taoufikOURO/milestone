import { describe, expect, it } from "vitest";
import { computeCpm, prepareTasks } from "@/lib/planning/cpm";
import { group, input, J, task } from "@/lib/planning/__tests__/fixtures";

const G = group("G", 0, 30);
const cpmOf = (...tasks: ReturnType<typeof task>[]) => computeCpm(prepareTasks(input([G], tasks)));
const span = (start: number, end: number) => ({ start: J(start), end: J(end) });

describe("computeCpm", () => {
  it("chaîne : chaque tâche démarre le lendemain de sa dépendance", () => {
    const cpm = cpmOf(task("a", "G", 2), task("b", "G", 3, { deps: ["a"] }), task("c", "G", 1, { deps: ["b"] }));
    expect(cpm.earliest.get("a")).toEqual(span(0, 1));
    expect(cpm.earliest.get("b")).toEqual(span(2, 4));
    expect(cpm.earliest.get("c")).toEqual(span(5, 5));
    expect(Object.fromEntries(cpm.tail)).toEqual({ a: 6, b: 4, c: 1 });
  });

  it("diamant : début au plus tôt = fin de la plus longue des dépendances", () => {
    const cpm = cpmOf(
      task("a", "G", 2),
      task("b", "G", 1, { deps: ["a"] }),
      task("c", "G", 3, { deps: ["a"] }),
      task("d", "G", 1, { deps: ["b", "c"] }),
    );
    expect(cpm.earliest.get("b")).toEqual(span(2, 2));
    expect(cpm.earliest.get("c")).toEqual(span(2, 4));
    expect(cpm.earliest.get("d")).toEqual(span(5, 5));
    expect(Object.fromEntries(cpm.tail)).toEqual({ a: 6, b: 2, c: 4, d: 1 });
  });

  it("tail tient compte de la marge du groupe", () => {
    const tasks = prepareTasks(
      input([group("M", 0, 30, 20)], [task("a", "M", 2), task("b", "M", 3, { deps: ["a"] })]),
    );
    // 2 j → 3, 3 j → 4.
    expect(Object.fromEntries(computeCpm(tasks).tail)).toEqual({ a: 7, b: 4 });
  });

  it("fenêtre : ES ≥ max(début du groupe, aujourd'hui)", () => {
    const started = prepareTasks(input([group("G", 0, 30)], [task("a", "G", 1)], J(3)));
    expect(computeCpm(started).earliest.get("a")!.start).toBe(J(3));
    const future = prepareTasks(input([group("G", 5, 30)], [task("a", "G", 1)], J(3)));
    expect(computeCpm(future).earliest.get("a")!.start).toBe(J(5));
  });

  it("une tâche en cours démarre aujourd'hui et n'attend plus ses dépendances", () => {
    const tasks = prepareTasks(
      input(
        [group("G", 5, 30)],
        [task("a", "G", 4), task("b", "G", 2, { deps: ["a"], status: "in_progress" })],
        J(3),
      ),
    );
    expect(tasks.find((t) => t.id === "b")!.dependsOnIds).toEqual([]);
    expect(computeCpm(tasks).earliest.get("b")).toEqual(span(3, 4));
  });

  it("une dépendance terminée est satisfaite et sort du calcul", () => {
    const cpm = cpmOf(task("a", "G", 5, { status: "done" }), task("b", "G", 2, { deps: ["a"] }));
    expect(cpm.earliest.has("a")).toBe(false);
    expect(cpm.earliest.get("b")).toEqual(span(0, 1));
    expect(cpm.tail.get("b")).toBe(2);
  });

  it("cycle injecté : termine, isole le cycle et son aval", () => {
    const cpm = cpmOf(
      task("e", "G", 1),
      task("a", "G", 1, { deps: ["b", "e"] }),
      task("b", "G", 1, { deps: ["a"] }),
      task("c", "G", 1, { deps: ["b"] }),
      task("d", "G", 1),
      task("s", "G", 1, { deps: ["s"] }),
    );
    expect(cpm.cycleMembers).toEqual(new Set(["a", "b", "s"]));
    expect(cpm.unordered).toEqual(new Set(["a", "b", "c", "s"]));
    expect([...cpm.earliest.keys()].sort()).toEqual(["d", "e"]);
    expect(cpm.tail.get("e")).toBe(1);
  });

  it("refuse une entrée incohérente", () => {
    expect(() => prepareTasks(input([G], [task("a", "X", 1)]))).toThrow(/Groupe inconnu/);
    expect(() => prepareTasks(input([G], [task("a", "G", 1, { deps: ["zz"] })]))).toThrow(/Dépendance invalide/);
    expect(() =>
      prepareTasks(input([G, group("H", 0, 30)], [task("a", "G", 1, { deps: ["b"] }), task("b", "H", 1)])),
    ).toThrow(/Dépendance invalide/);
    expect(() => prepareTasks(input([G], [task("a", "G", 1), task("a", "G", 2)]))).toThrow(/double/);
  });
});
