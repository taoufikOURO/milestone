import { hash, verify } from "@node-rs/argon2";

// argon2id (recommandation OWASP) via @node-rs/argon2 : binaires précompilés,
// sans script d'installation. Paramètres OWASP : 19 Mio, 2 itérations, 1 fil.
// Le sel est généré par la bibliothèque et inclus dans la chaîne PHC.
const OPTIONS = {
  algorithm: 2, // Algorithm.Argon2id (const enum non utilisable avec isolatedModules)
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // Hash illisible (format inattendu) : refus, sans exception.
    return false;
  }
}

// Hash d'un mot de passe arbitraire, calculé une seule fois. Il sert à vérifier
// « dans le vide » quand l'email est inconnu, pour que le temps de réponse de la
// connexion ne révèle pas si un compte existe.
let dummyHash: Promise<string> | undefined;

export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword("milestone-dummy-password");
  await verifyPassword(await dummyHash, password);
  return false;
}
