import { expect, test } from "@playwright/test";
import { register, uniqueEmail } from "./helpers";

/** Smoke du studio d'écriture : roman → chapitre → édition + autosave. */
test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail("nov"), "Auteur Romans");
});

test("romans : créer un roman, un chapitre, écrire et voir l'autosave", async ({ page }) => {
  await page.goto("/novels");
  await expect(page.getByRole("heading", { level: 1, name: "Romans" })).toBeVisible();

  const title = `Roman ${Date.now()}`;
  await page.getByRole("button", { name: "+ Nouveau roman" }).click();
  await page.getByPlaceholder("Les Cendres d'Aetheris").fill(title);
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await expect(page).toHaveURL(/\/novels\//);

  await page.getByRole("button", { name: "+ Nouveau chapitre" }).click();
  await expect(page.getByRole("link", { name: "Nouveau chapitre" })).toBeVisible();

  await page.getByRole("link", { name: "Écrire" }).click();
  await expect(page).toHaveURL(/\/chapters\//);

  const prose = page.locator(".novel-prose");
  await prose.click();
  await prose.pressSequentially("Le port sentait la cendre et la pluie.");

  await expect(page.getByText(/^\d+ mots$/)).toBeVisible();
  await expect(page.getByText("Enregistré ✓")).toBeVisible({ timeout: 30_000 });
});
