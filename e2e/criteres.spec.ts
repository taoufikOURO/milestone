import { expect, test, type Page } from "@playwright/test";
import {
  createGroup,
  createPromo,
  createTask,
  createUser,
  PASSWORD,
  unique,
  withDb,
  type SeedUser,
} from "./support/db";
import { dialog, findCalendarBlock, signIn, signInVerified, taskSpan, verificationLink } from "./support/ui";

// Un scénario par critère d'acceptation du cahier des charges (§11), dans
// l'ordre. Les données de départ sont posées en base ; l'action testée passe
// toujours par l'interface, donc par les server actions et les services.
// Quand l'interface empêche déjà l'action, le scénario force aussi la requête
// pour vérifier le refus côté serveur.

const label = (u: SeedUser) => `${u.firstName} ${u.lastName} (@${u.username})`;

async function switchUser(page: Page, user: SeedUser) {
  await page.context().clearCookies();
  await signInVerified(page, user);
}

async function fillSignUp(page: Page, data: { username: string; email: string; password: string }) {
  await page.goto("/inscription");
  await page.getByLabel("Nom d'utilisateur", { exact: true }).fill(data.username);
  await page.getByLabel("Prénom", { exact: true }).fill("Awa");
  await page.getByLabel("Nom", { exact: true }).fill("Mensah");
  await page.getByLabel("Email", { exact: true }).fill(data.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(data.password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
}

const countUsersByEmail = (email: string) =>
  withDb(async (db) => (await db.query("SELECT 1 FROM users WHERE email = $1", [email])).rowCount);

test("Critère 1 — un utilisateur non validé ne peut rien faire d'autre que valider son email", async ({ page }) => {
  const username = unique("nv");
  const email = `${username}@example.test`;
  await fillSignUp(page, { username, email, password: PASSWORD });
  await expect(page).toHaveURL(/\/connexion\?inscription=ok$/);

  await signIn(page, { email });
  await expect(page).toHaveURL(/\/verifier-email$/);
  await expect(page.getByRole("button", { name: "Renvoyer le mail" })).toBeVisible();

  for (const path of ["/accueil", "/promo", "/promo/creer", "/promo/rejoindre", "/groupes/creer", "/mon-calendrier", "/profil"]) {
    await page.goto(path);
    await expect(page, `accès à ${path}`).toHaveURL(/\/verifier-email$/);
  }

  // Lien lu dans la boîte d'envoi de test (transport console), jamais dans un vrai mail.
  await page.goto(await verificationLink(email));
  await page.getByRole("button", { name: "Valider mon adresse email" }).click();
  await expect(page.getByText("Votre adresse email est validée.")).toBeVisible();
  await page.getByRole("link", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/accueil$/);
});

test("Critère 2 — un nom d'utilisateur déjà pris est refusé", async ({ page }) => {
  const taken = await withDb((db) => createUser(db, { prefix: "pris" }));
  const email = `${unique("autre")}@example.test`;
  await fillSignUp(page, { username: taken.username, email, password: PASSWORD });

  await expect(page.getByText("Ce nom d'utilisateur est déjà pris.")).toBeVisible();
  await expect(page).toHaveURL(/\/inscription$/);
  expect(await countUsersByEmail(email)).toBe(0);
});

test("Critère 3 — un mot de passe de moins de 8 caractères est refusé", async ({ page }) => {
  const username = unique("court");
  const email = `${username}@example.test`;
  await fillSignUp(page, { username, email, password: "1234567" });

  await expect(page.getByText("Le mot de passe doit contenir au moins 8 caractères.")).toBeVisible();
  await expect(page).toHaveURL(/\/inscription$/);
  expect(await countUsersByEmail(email)).toBe(0);
});

test("Critère 4 — un étudiant ne peut pas rejoindre une deuxième promo", async ({ page }) => {
  const { student, promoA, promoB } = await withDb(async (db) => {
    const student = await createUser(db, { prefix: "etu" });
    const promoA = await createPromo(db, await createUser(db, { prefix: "delA" }));
    const promoB = await createPromo(db, await createUser(db, { prefix: "delB" }));
    return { student, promoA, promoB };
  });
  await signInVerified(page, student);

  // Formulaire ouvert avant de rejoindre la promo A dans un autre onglet.
  await page.goto("/promo/rejoindre");
  const other = await page.context().newPage();
  await other.goto("/promo/rejoindre");
  await other.getByLabel("Code de la promo").fill(promoA.code);
  await other.getByRole("button", { name: "Rejoindre" }).click();
  await expect(other).toHaveURL(/\/promo$/);
  await other.close();

  // Refus côté serveur.
  await page.getByLabel("Code de la promo").fill(promoB.code);
  await page.getByRole("button", { name: "Rejoindre" }).click();
  await expect(page.getByText("Vous êtes déjà dans une promo.")).toBeVisible();

  // Refus côté interface : la page de saisie n'est plus proposée.
  await page.goto("/promo/rejoindre");
  await expect(page).toHaveURL(/\/promo$/);

  const rows = await withDb(
    async (db) => (await db.query("SELECT promo_id FROM promo_members WHERE user_id = $1", [student.id])).rows,
  );
  expect(rows).toEqual([{ promo_id: promoA.id }]);
});

test("Critère 5 — le délégué ne peut pas quitter la promo sans avoir nommé un successeur", async ({ page }) => {
  const { delegate, member } = await withDb(async (db) => {
    const delegate = await createUser(db, { prefix: "del" });
    const member = await createUser(db, { prefix: "mem" });
    await createPromo(db, delegate, [member]);
    return { delegate, member };
  });
  const roleOf = (userId: string) =>
    withDb(async (db) => (await db.query("SELECT role FROM promo_members WHERE user_id = $1", [userId])).rows[0]?.role);

  await signInVerified(page, delegate);
  await page.goto("/promo");
  const leave = page.getByRole("button", { name: "Quitter la promo" });

  // Interface : sans successeur, la confirmation ne s'ouvre pas.
  await leave.click();
  await expect(dialog(page)).toBeHidden();

  // Serveur : requête forcée sans successeur, refusée.
  await page.locator("#successorId").evaluate((el) => el.removeAttribute("required"));
  await leave.click();
  await dialog(page).getByRole("button", { name: "Quitter la promo" }).click();
  await expect(page.getByText("Nommez un successeur parmi les membres avant de quitter la promo.")).toBeVisible();
  expect(await roleOf(delegate.id)).toBe("delegate");

  // Avec un successeur, le départ est accepté et la délégation transmise.
  await page.locator("#successorId").selectOption({ label: label(member) });
  await leave.click();
  await dialog(page).getByRole("button", { name: "Quitter la promo" }).click();
  await expect(page.getByText("Vous n'êtes dans aucune promo.")).toBeVisible();
  expect(await roleOf(delegate.id)).toBeUndefined();
  expect(await roleOf(member.id)).toBe("delegate");
});

test("Critère 6 — le chef ne peut pas quitter le groupe sans avoir nommé un successeur", async ({ page }) => {
  const { leader, member, group } = await withDb(async (db) => {
    const leader = await createUser(db, { prefix: "chef" });
    const member = await createUser(db, { prefix: "mem" });
    const promo = await createPromo(db, leader, [member]);
    return { leader, member, group: await createGroup(db, promo.id, leader, [member]) };
  });
  const roleOf = (userId: string) =>
    withDb(
      async (db) =>
        (await db.query("SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2", [group.id, userId]))
          .rows[0]?.role,
    );

  await signInVerified(page, leader);
  await page.goto(`/groupes/${group.id}/membres`);
  const leave = page.getByRole("button", { name: "Quitter le groupe" });

  await leave.click();
  await expect(dialog(page)).toBeHidden();

  await page.locator("#successorId").evaluate((el) => el.removeAttribute("required"));
  await leave.click();
  await dialog(page).getByRole("button", { name: "Quitter le groupe" }).click();
  await expect(page.getByText("Nommez un successeur parmi les membres avant de quitter le groupe.")).toBeVisible();
  expect(await roleOf(leader.id)).toBe("leader");

  await page.locator("#successorId").selectOption({ label: label(member) });
  await leave.click();
  await dialog(page).getByRole("button", { name: "Quitter le groupe" }).click();
  await expect(page).toHaveURL(/\/accueil$/);
  expect(await roleOf(leader.id)).toBeUndefined();
  expect(await roleOf(member.id)).toBe("leader");
});

test("Critère 7 — une tâche sans assigné après le départ d'un membre apparaît comme non assignée", async ({ page }) => {
  const { leader, member, group } = await withDb(async (db) => {
    const leader = await createUser(db, { prefix: "chef" });
    const member = await createUser(db, { prefix: "mem" });
    const promo = await createPromo(db, leader, [member]);
    const group = await createGroup(db, promo.id, leader, [member]);
    await createTask(db, group.id, { title: "Rapport du membre", durationDays: 2, assignees: [member] });
    await createTask(db, group.id, { title: "Tâche partagée", durationDays: 2, assignees: [member, leader] });
    return { leader, member, group };
  });

  await signInVerified(page, member);
  await page.goto(`/groupes/${group.id}/membres`);
  await page.getByRole("button", { name: "Quitter le groupe" }).click();
  await dialog(page).getByRole("button", { name: "Quitter le groupe" }).click();
  await expect(page).toHaveURL(/\/accueil$/);

  await switchUser(page, leader);
  await page.goto(`/groupes/${group.id}/taches`);
  const row = (title: string) => page.getByRole("listitem").filter({ hasText: title });
  await expect(row("Rapport du membre").getByText("Non assignée")).toBeVisible();
  await expect(row("Tâche partagée").getByText("Non assignée")).toHaveCount(0);
  await expect(page.getByText("1 non assignée")).toBeVisible();

  await page.goto(`/groupes/${group.id}`);
  await expect(page.getByText("1 tâche non assignée")).toBeVisible();
});

test("Critère 8 — seul le chef peut supprimer le groupe, après confirmation", async ({ page }) => {
  const { leader, member, group } = await withDb(async (db) => {
    const leader = await createUser(db, { prefix: "chef" });
    const member = await createUser(db, { prefix: "mem" });
    const promo = await createPromo(db, leader, [member]);
    const group = await createGroup(db, promo.id, leader, [member]);
    await createTask(db, group.id, { title: "Une tâche", durationDays: 1, assignees: [member] });
    return { leader, member, group };
  });
  const groupExists = () =>
    withDb(async (db) => (await db.query("SELECT 1 FROM groups WHERE id = $1", [group.id])).rowCount === 1);
  const setLeader = (userId: string, other: string) =>
    withDb(async (db) => {
      await db.query("UPDATE group_members SET role = 'member' WHERE group_id = $1 AND user_id = $2", [group.id, other]);
      await db.query("UPDATE group_members SET role = 'leader' WHERE group_id = $1 AND user_id = $2", [group.id, userId]);
    });

  // Un membre n'a pas accès aux paramètres.
  await signInVerified(page, member);
  await page.goto(`/groupes/${group.id}/parametres`);
  await expect(page).toHaveURL(new RegExp(`/groupes/${group.id}$`));
  await expect(page.getByRole("button", { name: "Supprimer le groupe" })).toHaveCount(0);

  // Le chef : la confirmation détaille les conséquences ; l'annulation ne supprime rien.
  await switchUser(page, leader);
  await page.goto(`/groupes/${group.id}/parametres`);
  await page.getByRole("button", { name: "Supprimer le groupe" }).click();
  await expect(dialog(page)).toContainText("Cette action est définitive.");
  await dialog(page).getByRole("button", { name: "Annuler" }).click();
  await expect(dialog(page)).toBeHidden();
  expect(await groupExists()).toBe(true);

  // Refus côté serveur : la page est ouverte, mais il n'est plus chef.
  await setLeader(member.id, leader.id);
  await page.getByRole("button", { name: "Supprimer le groupe" }).click();
  await dialog(page).getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page.getByText("Seul le chef du groupe peut effectuer cette action.")).toBeVisible();
  expect(await groupExists()).toBe(true);

  // Redevenu chef : suppression confirmée.
  await setLeader(leader.id, member.id);
  await page.reload();
  await page.getByRole("button", { name: "Supprimer le groupe" }).click();
  await dialog(page).getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page).toHaveURL(/\/accueil$/);
  expect(await groupExists()).toBe(false);
});

test("Critère 9 — la barre du calendrier de promo se remplit selon l'avancement du groupe", async ({ page }) => {
  const { leader, group, taskId } = await withDb(async (db) => {
    const leader = await createUser(db, { prefix: "chef" });
    const promo = await createPromo(db, leader);
    const group = await createGroup(db, promo.id, leader);
    const taskId = await createTask(db, group.id, { title: "Trois jours", durationDays: 3, assignees: [leader] });
    await createTask(db, group.id, { title: "Un jour", durationDays: 1, assignees: [leader] });
    return { leader, group, taskId };
  });
  const bar = (percent: number) =>
    page.getByRole("link", { name: new RegExp(`^${group.name} · ${percent} % · fin le `) });

  await signInVerified(page, leader);
  await page.goto("/promo");
  await expect(bar(0)).toBeVisible();

  await page.goto(`/groupes/${group.id}/taches/${taskId}`);
  await page.getByRole("button", { name: "Terminée" }).click();
  await expect(page.getByText("Statut mis à jour.")).toBeVisible();

  // 3 jours terminés sur 4 : 75 %.
  await page.goto("/promo");
  await expect(bar(75)).toBeVisible();
  await expect(bar(75).locator("span[aria-hidden]")).toHaveAttribute("style", /width:\s*75%/);

  await bar(75).click();
  await expect(page).toHaveURL(new RegExp(`/groupes/${group.id}$`));
});

test("Critère 10 — une tâche ne peut pas être planifiée avant ses dépendances", async ({ page }) => {
  const { leader, group, taskB } = await withDb(async (db) => {
    const leader = await createUser(db, { prefix: "chef" });
    const member = await createUser(db, { prefix: "mem" });
    const promo = await createPromo(db, leader, [member]);
    const group = await createGroup(db, promo.id, leader, [member], { marginPercent: 0 });
    await createTask(db, group.id, { title: "Analyse", durationDays: 2, assignees: [leader] });
    const taskB = await createTask(db, group.id, { title: "Rédaction", durationDays: 1, assignees: [member] });
    return { leader, group, taskB };
  });

  await signInVerified(page, leader);
  await page.goto(`/groupes/${group.id}/calendrier`);
  const before = taskSpan((await findCalendarBlock(page, "Rédaction, du "))!);
  const analyse = taskSpan((await findCalendarBlock(page, "Analyse, du "))!);
  // Sans dépendance, les deux tâches (assignés différents) démarrent ensemble.
  expect(before.start).toBe(analyse.start);

  await page.goto(`/groupes/${group.id}/taches/${taskB}`);
  await page.getByRole("checkbox", { name: "Analyse" }).check();
  await page.getByRole("button", { name: "Enregistrer les dépendances" }).click();
  await expect(page.getByText("Dépendances enregistrées.")).toBeVisible();

  await page.goto(`/groupes/${group.id}/calendrier`);
  const after = taskSpan((await findCalendarBlock(page, "Rédaction, du "))!);
  const dep = taskSpan((await findCalendarBlock(page, "Analyse, du "))!);
  expect(after.start).toBeGreaterThan(dep.end);
});

test("Critère 11 — une tâche assignée à plusieurs personnes génère une réunion, pas une tâche assignée à une seule", async ({
  page,
}) => {
  const { leader, m1, m2, group } = await withDb(async (db) => {
    const leader = await createUser(db, { prefix: "chef" });
    const m1 = await createUser(db, { prefix: "un" });
    const m2 = await createUser(db, { prefix: "deux" });
    const promo = await createPromo(db, leader, [m1, m2]);
    return { leader, m1, m2, group: await createGroup(db, promo.id, leader, [m1, m2]) };
  });

  await signInVerified(page, leader);
  await page.goto(`/groupes/${group.id}/taches`);
  const create = async (title: string, assignees: SeedUser[]) => {
    await page.getByLabel("Titre", { exact: true }).fill(title);
    await page.getByLabel("Durée (jours)").fill("1");
    for (const a of assignees) await page.getByRole("checkbox", { name: label(a) }).check();
    await page.getByRole("button", { name: "Créer la tâche" }).click();
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
  };
  await create("Solo", [m1]);
  await create("Duo", [m1, m2]);

  await page.goto(`/groupes/${group.id}/calendrier`);
  expect(await findCalendarBlock(page, "Réunion, Duo, le ")).not.toBeNull();
  expect(await findCalendarBlock(page, "Réunion, Solo, le ")).toBeNull();
  // Les deux tâches sont bien planifiées.
  expect(await findCalendarBlock(page, "Solo, du ")).not.toBeNull();
});
