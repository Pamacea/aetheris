import { expect, test } from "@playwright/test";
import { campaignBasePath, createCampaign, register, uniqueEmail } from "./helpers";

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail("fiches"), "MJ Fiches");
  await createCampaign(page, `Campagne Fiches ${Date.now()}`);
});

test("fiches : template → entité → édition avec autosave", async ({ page }) => {
  const path = campaignBasePath(page);
  const templateName = `Héros ${Date.now()}`;
  const ficheTitle = `Astrid ${Date.now()}`;

  // 1. Modèle de fiche créé via l'UI wiki (propriété de features/wiki, lecture seule ici).
  await page.goto(`${path}/wiki/templates?embed=1`);
  await page.getByRole("button", { name: "+ Nouveau" }).click();
  await page.getByPlaceholder("Nom (ex. PNJ D&D5e)").fill(templateName);
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  // Le modèle créé doit être sélectionné avant d'ajouter un champ : sinon
  // l'édition part dans le modèle précédemment ouvert.
  await expect(page.getByLabel("Nom du modèle")).toHaveValue(templateName);
  await page.getByRole("button", { name: /Texte court/ }).click();
  // Le schéma du modèle n'a plus de bouton « Enregistrer » : autosave débouncé 700 ms.
  await page.waitForTimeout(1200);

  // 2. Entrée du wiki basée sur ce modèle → entité type = templateId.
  await page.goto(`${path}/wiki?embed=1`);
  await page.getByRole("button", { name: "+ Nouvelle" }).click();
  await page.getByPlaceholder("Titre de l'entrée").fill(ficheTitle);
  await page.locator('select[name="entree-template"]').selectOption({ label: templateName });
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await expect(page.getByText(ficheTitle).first()).toBeVisible();

  // 3. Page Fiches : la fiche apparaît, s'édite, autosave membre.
  await page.goto(`${path}/fiches?embed=1`);
  await page.getByRole("button", { name: ficheTitle }).click();
  await expect(page.getByRole("textbox", { name: "Texte court" })).toBeVisible();
  await page.getByLabel(/Texte court/).fill("Valkyrie");
  await expect(page.getByText("Enregistré ✓")).toBeVisible({ timeout: 15_000 });

  // Recharge : la valeur persiste (écriture réelle en base).
  await page.reload();
  await page.getByRole("button", { name: ficheTitle }).click();
  await expect(page.getByLabel(/Texte court/)).toHaveValue("Valkyrie");
});
