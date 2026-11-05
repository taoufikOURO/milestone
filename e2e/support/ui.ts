import { existsSync, readFileSync } from "node:fs";
import { expect, type Locator, type Page } from "@playwright/test";
import { PASSWORD, type SeedUser } from "./db";
import { OUTBOX_FILE } from "./env";

/** Dernier lien de validation envoyé à `email`, lu dans la boîte d'envoi de test. */
export async function verificationLink(email: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(() => {
      if (!existsSync(OUTBOX_FILE)) return undefined;
      const mails = readFileSync(OUTBOX_FILE, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { to: string; text: string })
        .filter((m) => m.to === email);
      const match = mails.at(-1)?.text.match(/https?:\/\/\S+\/verifier-email\/[A-Za-z0-9_-]+/);
      link = match?.[0];
      return link;
    }, { message: `lien de validation pour ${email}` })
    .toBeTruthy();
  return new URL(link!).pathname;
}

export async function signIn(page: Page, user: Pick<SeedUser, "email">, password = PASSWORD) {
  await page.goto("/connexion");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

export async function signInVerified(page: Page, user: SeedUser) {
  await signIn(page, user);
  await expect(page).toHaveURL(/\/accueil$/);
}

/** Bouton déclencheur d'un formulaire confirmé, puis bouton de la fenêtre de confirmation. */
export const dialog = (page: Page) => page.getByRole("dialog");

// ─── Calendrier mensuel ──────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  "janv.": 0,
  "févr.": 1,
  mars: 2,
  "avr.": 3,
  mai: 4,
  juin: 5,
  "juil.": 6,
  août: 7,
  "sept.": 8,
  "oct.": 9,
  "nov.": 10,
  "déc.": 11,
};

/** « 6 nov. 2026 » → timestamp UTC. */
export function parseFrDate(text: string): number {
  const m = text.trim().match(/^(\d{1,2}) (\S+) (\d{4})$/);
  if (!m || !(m[2] in MONTHS)) throw new Error(`Date illisible : ${text}`);
  return Date.UTC(Number(m[3]), MONTHS[m[2]], Number(m[1]));
}

/**
 * Bloc du calendrier dont le libellé commence par `prefix`, cherché dans le
 * mois affiché puis dans le suivant (une tâche peut déborder sur le mois
 * suivant). Revient ensuite au mois courant.
 */
export async function findCalendarBlock(page: Page, prefix: string): Promise<string | null> {
  const blocks = (): Locator => page.getByRole("link", { name: new RegExp(`^${escapeRegExp(prefix)}`) });
  await expect(page.getByRole("button", { name: "Mois suivant" })).toBeVisible();
  for (let i = 0; i < 2; i += 1) {
    if ((await blocks().count()) > 0) {
      const label = await blocks().first().getAttribute("aria-label");
      if (i > 0) await page.getByRole("button", { name: "Revenir à aujourd'hui" }).click();
      return label;
    }
    if (i === 0) await page.getByRole("button", { name: "Mois suivant" }).click();
  }
  await page.getByRole("button", { name: "Revenir à aujourd'hui" }).click();
  return null;
}

/** « Titre, du 4 nov. 2026 au 6 nov. 2026 » → bornes. */
export function taskSpan(label: string): { start: number; end: number } {
  const m = label.match(/, du (.+) au (.+)$/);
  if (!m) throw new Error(`Libellé de tâche inattendu : ${label}`);
  return { start: parseFrDate(m[1]), end: parseFrDate(m[2]) };
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
