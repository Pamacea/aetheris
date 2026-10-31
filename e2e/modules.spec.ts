import { expect, test } from "@playwright/test";
import { createCampaign, openModule, register, uniqueEmail } from "./helpers";

/** Smoke des modules reconstruits : wiki, graphe, choix, VTT. */
test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail("mod"), "MJ Modules");
  await createCampaign(page, `Campagne Modules ${Date.now()}`);
});

test("wiki : créer une entrée et la voir dans le panneau", async ({ page }) => {
  await openModule(page, "wiki");
  await expect(page).toHaveURL(/\/wiki/);
  const title = `Entrée ${Date.now()}`;
  await page.getByRole("button", { name: "+ Nouvelle" }).click();
  await page.getByPlaceholder("Titre de l'entrée").fill(title);
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await expect(page.getByText(title).first()).toBeVisible();
});

test("graphe : la page charge avec son titre", async ({ page }) => {
  await openModule(page, "graph");
  await expect(page).toHaveURL(/\/graph/);
  await expect(page.getByRole("heading", { level: 1, name: /Graphe de relations/ })).toBeVisible();
});

test("choix : lancer un vote et le voir dans l'historique", async ({ page }) => {
  const prompt = `Route ${Date.now()}`;
  await openModule(page, "choices");
  await expect(page).toHaveURL(/\/choices/);
  await page.getByPlaceholder("Quelle route prenons-nous ?").fill(prompt);
  await page.getByPlaceholder("Option 1").fill("Le port");
  await page.getByPlaceholder("Option 2").fill("La forêt");
  await page.getByRole("button", { name: "Lancer le choix" }).click();
  await expect(page.getByText(prompt).first()).toBeVisible();
});

test("vtt : la table se charge avec un canvas", async ({ page }) => {
  await openModule(page, "vtt");
  await expect(page).toHaveURL(/\/vtt/);
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 30_000 });
});
