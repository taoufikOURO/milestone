// Dépendances entre tâches (§4.5). Module pur, sans base de données : le
// service l'appelle dans la transaction, sous verrou du groupe.

export type DependencyEdge = { taskId: string; dependsOnTaskId: string };

/**
 * Premier cycle trouvé par parcours en profondeur, sous la forme
 * [a, b, …, a] (a dépend de b, …), ou null s'il n'y en a pas. Une
 * auto-dépendance est un cycle [a, a]. Parcours itératif : pas de limite de
 * pile sur une longue chaîne.
 */
export function findCycle(edges: readonly DependencyEdge[]): string[] | null {
  const graph = new Map<string, string[]>();
  for (const { taskId, dependsOnTaskId } of edges) {
    const next = graph.get(taskId);
    if (next) next.push(dependsOnTaskId);
    else graph.set(taskId, [dependsOnTaskId]);
  }

  // Absent : non visité ; 1 : sur le chemin courant ; 2 : terminé.
  const state = new Map<string, 1 | 2>();
  for (const root of graph.keys()) {
    if (state.has(root)) continue;
    const path: string[] = [root];
    const cursors: number[] = [0];
    state.set(root, 1);
    while (path.length > 0) {
      const node = path[path.length - 1];
      const next = graph.get(node) ?? [];
      const i = cursors[cursors.length - 1];
      if (i >= next.length) {
        state.set(node, 2);
        path.pop();
        cursors.pop();
        continue;
      }
      cursors[cursors.length - 1] = i + 1;
      const child = next[i];
      const seen = state.get(child);
      if (seen === 1) return [...path.slice(path.indexOf(child)), child];
      if (seen === undefined) {
        state.set(child, 1);
        path.push(child);
        cursors.push(0);
      }
    }
  }
  return null;
}

/**
 * Cycle créé si les dépendances de `taskId` sont remplacées par
 * `dependsOnIds` ; null si le remplacement est acceptable.
 */
export function cycleAfterReplacing(
  edges: readonly DependencyEdge[],
  taskId: string,
  dependsOnIds: readonly string[],
): string[] | null {
  const kept = edges.filter((e) => e.taskId !== taskId);
  return findCycle([...kept, ...dependsOnIds.map((dependsOnTaskId) => ({ taskId, dependsOnTaskId }))]);
}
