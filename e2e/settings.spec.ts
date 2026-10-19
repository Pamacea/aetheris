import { expect, test } from "@playwright/test";
import { createCampaign, register, uniqueEmail } from "./helpers";

/** Réglages : contrat de la page (infos + thème + invitation) et modules. */
test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail("set"), "MJ Réglages");
  await createCampaign(page, `Campagne Réglages ${Date.now()}`);
  await page.getByRole("link", { name: "Réglages" }).click();
  await expect(page).toHaveURL(/\/settings/);
});

test("contrat : formulaire d'infos, éditeur de thème et code d'invitation", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Réglages" })).toBeVisible();
  await expect(page.getByLabel("Titre")).toBeVisible();
  await expect(page.locator("#theme-css")).toBeVisible();
  await expect(page.locator("#theme-js")).toBeVisible();
  // « Enregistrer » : formulaire d'infos + sauvegarde du thème
  await expect(page.getByRole("button", { name: "Enregistrer" })).toHaveCount(2);
  await expect(page.getByText("Code d'invitation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copier le code" })).toBeVisible();
});

test("modules : les 5 plugins du catalogue sont listés, core jamais désactivable", async ({
  page,
}) => {
  for (const name of [
    "Combat & Initiative",
    "Journal & Captures",
    "Ambiance sonore",
    "Fiches joueurs",
    "Constructeur de macros",
  ]) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `Désactiver ${name}` })).toBeVisible();
  }
  await expect(page.getByText(/toujours actif/i)).toBeVisible();
  await expect(page.getByText(/renvoie 404 pour tout le monde/i)).toBeVisible();
});

test("modules : désactiver puis réactiver un module tient après rafraîchissement", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Désactiver Ambiance sonore" }).click();
  await expect(page.getByRole("button", { name: "Activer Ambiance sonore" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Activer Ambiance sonore" })).toBeVisible();
  await expect(page.getByText("Inactif").first()).toBeVisible();

  await page.getByRole("button", { name: "Activer Ambiance sonore" }).click();
  await expect(page.getByRole("button", { name: "Désactiver Ambiance sonore" })).toBeVisible();
});
