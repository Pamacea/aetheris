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

  // Création inline : Entrée sur la ligne « nouveau chapitre ».
  await page.getByLabel("Titre du nouveau chapitre").press("Enter");

  // Le titre n'est éditable qu'en mode renommage (menu contextuel).
  await page.getByRole("link", { name: "Nouveau chapitre" }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Renommer" }).click();
  const rowTitle = page.getByLabel("Titre du chapitre 1");
  await expect(rowTitle).toHaveValue("Nouveau chapitre");

  // Rename depuis la liste : Enter = sauvegarde serveur, puis relecture.
  await rowTitle.fill("Le port de cendre");
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await rowTitle.press("Enter");
  await saved;
  await page.reload();
  await page.getByRole("link", { name: "Le port de cendre" }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Renommer" }).click();
  await expect(page.getByLabel("Titre du chapitre 1")).toHaveValue("Le port de cendre");

  // Statut du chapitre : cycle via le menu contextuel (Brouillon → En écriture).
  const chapterRow = page.getByRole("listitem").filter({ hasText: "Le port de cendre" });
  await page.getByLabel("Titre du chapitre 1").press("Escape");
  await expect(chapterRow).toContainText("Brouillon");
  await page.getByRole("link", { name: "Le port de cendre" }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Statut suivant : En écriture" }).click();
  await expect(chapterRow).toContainText("En écriture");

  await page.getByRole("link", { name: "Le port de cendre" }).click();
  await expect(page).toHaveURL(/\/chapters\//);
  // Titre éditable aussi sur l'éditeur.
  await expect(page.getByLabel("Titre du chapitre")).toHaveValue("Le port de cendre");

  const prose = page.locator(".novel-prose");
  await prose.click();
  await prose.pressSequentially("Le port sentait la cendre et la pluie.");

  await expect(page.getByText(/^\d+ mots$/)).toBeVisible();
  await expect(page.getByText("Enregistré ✓")).toBeVisible({ timeout: 30_000 });
});
