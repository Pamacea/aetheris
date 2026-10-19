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
