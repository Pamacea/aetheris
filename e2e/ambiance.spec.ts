import { expect, test } from "@playwright/test";
import { createCampaign, register, uniqueEmail } from "./helpers";

/** Smoke du module Ambiance : création de playlist + édition de pistes. */
test("ambiance : créer une playlist, lui ajouter une piste", async ({ page }) => {
  await register(page, uniqueEmail("amb"), "MJ Ambiance");
  await createCampaign(page, `Campagne Ambiance ${Date.now()}`);

  await page.getByRole("link", { name: "Ambiance" }).click();
  await expect(page).toHaveURL(/\/ambiance/);
  await expect(page.getByRole("heading", { level: 1, name: /Ambiance sonore/ })).toBeVisible();

  const name = `Taverne ${Date.now()}`;
  await page.getByPlaceholder("Forêt maudite, Taverne, Combat…").fill(name);
  await page.getByRole("button", { name: "Créer" }).click();
  // `.first()` tombait sur l'<option> cachée du select — on cible la liste visible.
  await expect(page.getByRole("listitem").filter({ hasText: name })).toBeVisible();

  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByLabel("Titre de la nouvelle piste").fill("Ambre");
  await page.getByLabel("URL de la nouvelle piste").fill("https://example.com/ambre.mp3");
  await page.getByRole("button", { name: "+ Ajouter la piste" }).click();
  await expect(page.getByLabel("Titre de la piste 1")).toHaveValue("Ambre");

  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("1 piste")).toBeVisible();
});

/** Import local : refus hors audio, data-URI persistée en DB, présente après reload. */
test("ambiance : importer un fichier sonore local", async ({ page }) => {
  await register(page, uniqueEmail("amb-imp"), "MJ Import");
  await createCampaign(page, `Campagne Import ${Date.now()}`);

  await page.getByRole("link", { name: "Ambiance" }).click();
  await expect(page).toHaveURL(/\/ambiance/);

  await page.getByPlaceholder("Forêt maudite, Taverne, Combat…").fill(`Scène ${Date.now()}`);
  await page.getByRole("button", { name: "Créer" }).click();
  await page.getByRole("button", { name: "Modifier" }).click();

  const file = page.locator('input[name="piste-fichier"]');

  // Hors audio → refus visible, rien d'ajouté.
  await file.setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("pas du son"),
  });
  await expect(page.getByText(/seul un fichier audio/)).toBeVisible();

  // Fichier audio → piste au brouillon (titre = nom du fichier).
  await file.setInputFiles({
    name: "brume.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from("ID3~contenu-mpeg-synthetique"),
  });
  await expect(page.getByText("Fichier importé")).toBeVisible();

  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("1 piste")).toBeVisible();

  // Rechargement : la data-URI est revenue de la DB et passe le schéma partagé.
  await page.reload();
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByText("Fichier importé")).toBeVisible();
  await expect(page.getByLabel("Titre de la piste 1")).toHaveValue("brume");
});
