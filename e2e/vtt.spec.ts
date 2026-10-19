import { expect, test } from "@playwright/test";
import { createCampaign, inviteCode, moduleLink, register, uniqueEmail } from "./helpers";

/** Dette v1.0 : jetons (propriétaire, PV/CA) + saisie d'URL de carte distante. */
test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail("vtt"), "MJ VTT");
  await createCampaign(page, `Campagne VTT ${Date.now()}`);
});

test("jeton : PV/CA et propriétaire édités par le MJ, persistés", async ({ page }) => {
  // URL directe : même caméra de départ pour les spots ci-dessous.
  await page.goto(`${new URL(page.url()).pathname}/vtt`);
  await expect(page).toHaveURL(/\/vtt/);
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Tokens", exact: true }).click();
  const spot = { x: 240, y: 220 };
  await canvas.click({ position: spot });

  const hp = page.getByLabel("Points de vie", { exact: true });
  const hpMax = page.getByLabel("Points de vie max", { exact: true });
  const ac = page.getByLabel("Classe d'armure", { exact: true });
  // Sélecteur : le <select> est dans son <label> (le nom accessible y intègre
  // les options) — on cible le label puis le contrôle.
  const owner = page.locator("label").filter({ hasText: "Propriétaire" }).locator("select");
  await expect(hp).toBeVisible();

  // PV plafonné au maximum saisi.
  await hpMax.fill("10");
  await hp.fill("50");
  await expect(hp).toHaveValue("10");
  await hp.fill("7");
  await ac.fill("15");
  await owner.selectOption({ label: "MJ VTT" });
  await expect(owner).not.toHaveValue("");

  // Commit débouncé (500 ms) → persistance Zod → scène rechargée.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  // Caméra réinitialisée à l'identique : le même clic re-sélectionne le jeton.
  await page.getByRole("button", { name: "Tokens", exact: true }).click();
  await canvas.click({ position: spot });
  await expect(hp).toHaveValue("7");
  await expect(hpMax).toHaveValue("10");
  await expect(ac).toHaveValue("15");
  await expect(owner).not.toHaveValue("");
});

test("joueur : PV éditables sur son jeton, jamais les autres champs", async ({ page, browser }) => {
  const invite = ((await inviteCode(page).textContent()) ?? "").trim();
  expect(invite).not.toBe("");

  const ctx = await browser.newContext();
  const player = await ctx.newPage();
  await register(player, uniqueEmail("vtt-j"), "Joueur VTT");
  await player.getByPlaceholder("Code d'invitation…").fill(invite);
  await player.getByRole("button", { name: "Rejoindre" }).click();
  await expect(player).toHaveURL(/\/campaign\//);
  const playerPath = new URL(player.url()).pathname;

  // MJ (page pleine via URL directe, donc avec le membre déjà dans la liste) :
  // deux jetons, l'un remis au joueur.
  await page.goto(`${new URL(page.url()).pathname}/vtt`);
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Tokens", exact: true }).click();
  const owned = { x: 240, y: 220 };
  const free = { x: 460, y: 340 };
  await canvas.click({ position: owned });
  await page
    .locator("label")
    .filter({ hasText: "Propriétaire" })
    .locator("select")
    .selectOption({ label: "Joueur VTT" });
  await page.getByLabel("Points de vie", { exact: true }).fill("7");
  await page.getByLabel("Points de vie max", { exact: true }).fill("10");
  await canvas.click({ position: free }); // jeton sans propriétaire
  await page.waitForTimeout(1500); // commit débouncé (500 ms)

  // Joueur : la table ne montre pas les outils d'édition de la table.
  await player.goto(`${playerPath}/vtt`);
  const pcanvas = player.locator("canvas").first();
  await expect(pcanvas).toBeVisible({ timeout: 30_000 });
  await expect(player.getByRole("button", { name: "Tokens", exact: true })).toBeHidden();

  await pcanvas.click({ position: owned });
  const php = player.getByLabel("Points de vie", { exact: true });
  await expect(php).toBeVisible(); // son jeton : PV éditables
  await expect(player.getByLabel("Points de vie max", { exact: true })).toBeHidden();
  await expect(player.getByLabel("Classe d'armure", { exact: true })).toBeHidden();
  await expect(player.locator("label").filter({ hasText: "Propriétaire" })).toHaveCount(0);
  await php.fill("9");
  await expect(php).toHaveValue("9");

  await pcanvas.click({ position: free }); // jeton d'autrui : aucune édition
  await expect(php).toBeHidden();

  await ctx.close();
});

test("carte : URL distante http(s) acceptée, autre scheme refusé", async ({ page }) => {
  await moduleLink(page, /table/i).click();
  await expect(page).toHaveURL(/\/vtt/);
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Grille", exact: true }).click();
  const url = page.getByLabel("URL de la carte", { exact: true });
  const error = page.getByText("URL http(s) invalide");

  await url.fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Charger", exact: true }).click();
  await expect(error).toBeVisible();

  await url.fill("https://exemple.fr/carte.png");
  await page.getByRole("button", { name: "Charger", exact: true }).click();
  await expect(error).toBeHidden();

  // URL distante persistée dans la scène : revue à l'ouverture suivante.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Grille", exact: true }).click();
  await expect(page.getByLabel("URL de la carte", { exact: true })).toHaveValue(
    "https://exemple.fr/carte.png",
  );
});
