import { randomInt, randomUUID } from "node:crypto";
import { Client } from "pg";
import { hashPassword } from "../../lib/auth/password";
import { e2eDatabaseUrl } from "./env";

// Accès direct à la base de test pour préparer les données et vérifier l'état
// final. Les actions testées, elles, passent toujours par l'interface.
// (Le client Prisma généré est un module ESM que Playwright ne charge pas.)

const TABLES = [
  "meetings",
  "task_dependencies",
  "task_assignments",
  "tasks",
  "group_invitations",
  "group_members",
  "groups",
  "promo_members",
  "promos",
  "email_tokens",
  "users",
];

export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: e2eDatabaseUrl() });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

export async function resetDatabase(db: Client): Promise<void> {
  await db.query(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
}

export const PASSWORD = "motdepasse-e2e";
let passwordHash: Promise<string> | undefined;

/** Suffixe unique : les scénarios partagent la base sans la vider entre eux. */
export const unique = (prefix: string) => `${prefix}${Date.now().toString(36)}${randomInt(1000)}`;

export type SeedUser = { id: string; username: string; email: string; firstName: string; lastName: string };

export async function createUser(
  db: Client,
  opts: { prefix?: string; verified?: boolean; firstName?: string } = {},
): Promise<SeedUser> {
  passwordHash ??= hashPassword(PASSWORD);
  const username = unique(opts.prefix ?? "u");
  const email = `${username}@example.test`;
  const firstName = opts.firstName ?? username;
  const lastName = "E2e";
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO users (username, first_name, last_name, email, password_hash, email_verified_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING id`,
    [username, firstName, lastName, email, await passwordHash, opts.verified === false ? null : new Date()],
  );
  return { id: rows[0].id, username, email, firstName, lastName };
}

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export async function createPromo(
  db: Client,
  delegate: SeedUser,
  members: SeedUser[] = [],
): Promise<{ id: string; code: string }> {
  const code = Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO promos (name, code, created_by) VALUES ($1, $2, $3) RETURNING id`,
    [unique("Promo "), code, delegate.id],
  );
  const promoId = rows[0].id;
  await db.query(`INSERT INTO promo_members (promo_id, user_id, role) VALUES ($1, $2, 'delegate')`, [
    promoId,
    delegate.id,
  ]);
  for (const m of members) {
    await db.query(`INSERT INTO promo_members (promo_id, user_id, role) VALUES ($1, $2, 'member')`, [promoId, m.id]);
  }
  return { id: promoId, code };
}

/** Date du jour décalée de `offset` jours, au format AAAA-MM-JJ (UTC = Africa/Lome). */
export const isoDay = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

export async function createGroup(
  db: Client,
  promoId: string,
  leader: SeedUser,
  members: SeedUser[] = [],
  opts: { name?: string; marginPercent?: number; days?: number } = {},
): Promise<{ id: string; name: string }> {
  const name = opts.name ?? unique("Groupe ");
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO groups (promo_id, name, start_date, end_date, created_by, margin_percent, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING id`,
    [promoId, name, isoDay(0), isoDay(opts.days ?? 30), leader.id, opts.marginPercent ?? 20],
  );
  const groupId = rows[0].id;
  await db.query(`INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'leader')`, [
    groupId,
    leader.id,
  ]);
  for (const m of members) {
    await db.query(`INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')`, [groupId, m.id]);
  }
  return { id: groupId, name };
}

export async function createTask(
  db: Client,
  groupId: string,
  opts: { title: string; durationDays: number; assignees?: SeedUser[]; dependsOn?: string[] },
): Promise<string> {
  const id = randomUUID();
  await db.query(
    `INSERT INTO tasks (id, group_id, title, duration_days, updated_at) VALUES ($1, $2, $3, $4, now())`,
    [id, groupId, opts.title, opts.durationDays],
  );
  for (const a of opts.assignees ?? []) {
    await db.query(`INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2)`, [id, a.id]);
  }
  for (const dep of opts.dependsOn ?? []) {
    await db.query(`INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2)`, [id, dep]);
  }
  return id;
}
