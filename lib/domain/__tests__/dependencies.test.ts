import { describe, expect, it } from "vitest";
import { cycleAfterReplacing, findCycle, type DependencyEdge } from "@/lib/domain/dependencies";

const e = (taskId: string, dependsOnTaskId: string): DependencyEdge => ({ taskId, dependsOnTaskId });

describe("findCycle", () => {
  it("ne trouve rien sans dépendance", () => {
    expect(findCycle([])).toBeNull();
  });

  it("accepte une chaîne et un losange sans cycle", () => {
    expect(findCycle([e("a", "b"), e("b", "c"), e("c", "d")])).toBeNull();
    expect(findCycle([e("a", "b"), e("a", "c"), e("b", "d"), e("c", "d")])).toBeNull();
  });

  it("détecte une auto-dépendance", () => {
    expect(findCycle([e("a", "a")])).toEqual(["a", "a"]);
  });

  it("détecte une boucle directe", () => {
    expect(findCycle([e("a", "b"), e("b", "a")])).toEqual(["a", "b", "a"]);
  });

  it("détecte une boucle au bout d'une chaîne", () => {
    const cycle = findCycle([e("x", "a"), e("a", "b"), e("b", "c"), e("c", "a")]);
    expect(cycle).toEqual(["a", "b", "c", "a"]);
  });

  it("supporte une longue chaîne sans dépasser la pile", () => {
    const edges = Array.from({ length: 20_000 }, (_, i) => e(`t${i}`, `t${i + 1}`));
    expect(findCycle(edges)).toBeNull();
    expect(findCycle([...edges, e("t20000", "t0")])).not.toBeNull();
  });
});

describe("cycleAfterReplacing", () => {
  const chain = [e("a", "b"), e("b", "c")];

  it("refuse de fermer une chaîne", () => {
    expect(cycleAfterReplacing(chain, "c", ["a"])).toEqual(["a", "b", "c", "a"]);
  });

  it("refuse l'auto-dépendance", () => {
    expect(cycleAfterReplacing(chain, "b", ["b"])).not.toBeNull();
  });

  it("remplace les anciennes dépendances de la tâche", () => {
    // b ne dépend plus de c : c peut alors dépendre de b.
    expect(cycleAfterReplacing([e("b", "c")], "b", [])).toBeNull();
    expect(cycleAfterReplacing([e("c", "b")], "b", ["a"])).toBeNull();
  });

  it("accepte une dépendance sans cycle", () => {
    expect(cycleAfterReplacing(chain, "a", ["b", "c"])).toBeNull();
  });
});
