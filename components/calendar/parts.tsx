import type { Person } from "@/lib/services/group";

// Éléments communs au calendrier d'un groupe et à « Mon calendrier ».

export const personName = (p: Person) => `${p.firstName} ${p.lastName}`;
