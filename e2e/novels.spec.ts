import { expect, test } from "@playwright/test";
import { register, uniqueEmail } from "./helpers";

/** Smoke du studio d'écriture : roman → statuts cycliques → chapitre → autosave. */
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

  // Statut du roman : CycleStatus (un clic = état suivant), plus de select.
  const novelStatus = page.getByRole("button", { name: /Statut du roman/ });
  await expect(novelStatus).toContainText("Brouillon");
  await novelStatus.click();
  await expect(novelStatus).toContainText("En écriture");

  await page.getByRole("button", { name: "+ Nouveau chapitre" }).click();
  const rowTitle = page.getByLabel("Titre du chapitre 1");
  await expect(rowTitle).toHaveValue("Nouveau chapitre");

  // Rename depuis la liste : Enter = sauvegarde serveur, puis relecture.
  await rowTitle.fill("Le port de cendre");
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await rowTitle.press("Enter");
  await saved;
  await page.reload();
  await expect(page.getByLabel("Titre du chapitre 1")).toHaveValue("Le port de cendre");

  // Statut du chapitre : cycle Brouillon → En écriture → Publié (un clic).
  const chapterStatus = page.getByRole("button", { name: /Statut de Le port de cendre/ });
  await expect(chapterStatus).toContainText("Brouillon");
  await chapterStatus.click();
  await expect(chapterStatus).toContainText("En écriture");

  await page.getByRole("link", { name: "Écrire" }).click();
  await expect(page).toHaveURL(/\/chapters\//);
  // Titre éditable aussi sur l'éditeur.
  await expect(page.getByLabel("Titre du chapitre")).toHaveValue("Le port de cendre");

  const prose = page.locator(".novel-prose");
  await prose.click();
  await prose.pressSequentially("Le port sentait la cendre et la pluie.");

  await expect(page.getByText(/^\d+ mots$/)).toBeVisible();
  await expect(page.getByText("Enregistré ✓")).toBeVisible({ timeout: 30_000 });
});
