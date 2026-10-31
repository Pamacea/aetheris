import { expect, test } from "@playwright/test";
import { campaignBasePath, createCampaign, register, uniqueEmail } from "./helpers";

/** Module Constructeur de macros (plugin `macros`) : éditeur sandbox + chat. */
test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail("mac"), "MJ Macros");
  await createCampaign(page, `Campagne Macros ${Date.now()}`);
});

test("macro : créer, exécuter et voir la commande dans le chat", async ({ page }) => {
  // Le chat vit désormais sur la table : le module s'ouvre dans une fenêtre
  // du bureau pour vérifier le broadcast dans le panneau Chat de la page VTT.
  await page
    .getByRole("navigation", { name: "Dock des modules" })
    .getByRole("button", { name: "Macros" })
    .click();
  const macros = page.frameLocator('iframe[title="Module Macros"]');
  await expect(
    macros.getByRole("heading", { level: 1, name: "Constructeur de macros" }),
  ).toBeVisible();

  // Nouvelle macro (corps par défaut → return "/roll 1d20").
  await macros.getByRole("button", { name: "+ Nouvelle macro" }).click();
  await macros.getByLabel("Nom").fill("Attaque lourde");
  await macros.getByRole("button", { name: "Enregistrer" }).click();
  await expect(macros.getByRole("button", { name: "Attaque lourde" })).toBeVisible();

  // Sandbox → jet émis sur la socket → broadcast visible dans le panneau Chat.
  const log = page.locator('[aria-label="Messages"]');
  await macros.getByRole("button", { name: "Exécuter au chat" }).click();
  await expect(macros.getByText("Jet envoyé : /roll 1d20")).toBeVisible();
  await expect(log.getByText("jette")).toBeVisible();

  // Message libre → même boucle, persisté côté serveur.
  await macros.getByLabel("Corps JS").fill('return "Bonjour depuis la macro";');
  await macros.getByRole("button", { name: "Exécuter au chat" }).click();
  await expect(macros.getByText("Message envoyé : Bonjour depuis la macro")).toBeVisible();
  await expect(log.getByText("Bonjour depuis la macro")).toBeVisible();
});

test("macro : commande inconnue affichée en erreur", async ({ page }) => {
  const hub = campaignBasePath(page);
  await page.goto(`${hub}/macros?embed=1`);
  await page.getByLabel("Corps JS").fill('return "/imprimer fiche";');
  await page.getByRole("button", { name: "Exécuter au chat" }).click();
  // Scopé : le route-announcer de Next porte aussi role="alert".
  await expect(page.getByText("Commande inconnue : /imprimer fiche")).toBeVisible();
  await expect(page.getByText("Jet envoyé")).toHaveCount(0);
});

test("macro : persistance localStorage par campagne + suppression", async ({ page }) => {
  const hub = campaignBasePath(page);
  await page.goto(`${hub}/macros?embed=1`);
  await page.getByRole("button", { name: "+ Nouvelle macro" }).click();
  await page.getByLabel("Nom").fill("Macro persistante");
  await page.getByLabel("Corps JS").fill('return "/roll 2d6";');
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await page.reload();
  const chip = page.getByRole("button", { name: "Macro persistante" });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.getByLabel("Corps JS")).toHaveValue('return "/roll 2d6";');

  // La confirm de suppression est acceptée (Playwright la masque sinon).
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(chip).toHaveCount(0);
});
