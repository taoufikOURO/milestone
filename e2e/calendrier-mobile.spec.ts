import { expect, test } from "@playwright/test";
import { createGroup, createPromo, createTask, createUser, withDb } from "./support/db";
import { signInVerified } from "./support/ui";

// Grille mois compacte sous 768 px : pas de défilement horizontal, panneau du
// bas accessible (dialog, Échap, focus rendu au jour).

test.use({ viewport: { width: 375, height: 812 } });

for (const where of ["group", "personal"] as const) {
  test(`Calendrier mobile (${where}) — grille compacte et panneau du jour`, async ({ page }) => {
    const { leader, group } = await withDb(async (db) => {
      const leader = await createUser(db, { prefix: "mob" });
      const promo = await createPromo(db, leader, []);
      const group = await createGroup(db, promo.id, leader, [], { days: 2 });
      await createTask(db, group.id, { title: "Longue tâche", durationDays: 6, assignees: [leader] });
      return { leader, group };
    });
    await signInVerified(page, leader);
    await page.goto(where === "group" ? `/groupes/${group.id}/calendrier` : "/mon-calendrier");

    const noOverflow = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(await noOverflow()).toBe(true);

    const today = page.getByRole("button", { name: /\(aujourd'hui\)/ });
    await expect(today).toBeVisible();
    await expect(page.getByRole("button", { name: "Mois suivant" })).toHaveJSProperty("offsetHeight", 44);

    await today.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Longue tâche" })).toBeVisible();
    expect(await noOverflow()).toBe(true);
    await page.screenshot({ path: `test-results/mobile-${where}-ouvert.png` });

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(today).toBeFocused();
    await page.screenshot({ path: `test-results/mobile-${where}-ferme.png` });

    await today.click();
    await page.getByRole("button", { name: "Fermer" }).click();
    await expect(sheet).toBeHidden();
    await expect(today).toBeFocused();
  });
}
