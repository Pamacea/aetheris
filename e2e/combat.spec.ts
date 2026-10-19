import { expect, test, type Page } from "@playwright/test";
import { createCampaign, inviteCode, register, uniqueEmail } from "./helpers";

/** Smoke du module Combat & Initiative (plugin `combat`). */

/**
 * Attend la réponse de L'action qui persiste un état donné (payload `round`).
 * Next enfile les server actions côté client : se fier au premier POST
 * `next-action` reçu peut tomber sur une autre action et recharger trop tôt.
 */
function waitStateSaved(page: Page, round: number) {
  return page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      r.request().headers()["next-action"] !== undefined &&
      new RegExp(`round\\\\?":${round}\\b`).test(r.request().postData() ?? ""),
  );
}

test("combat : ajout de combattants, initiative, tour suivant / round", async ({ page }) => {
  await register(page, uniqueEmail("combat"), "MJ Combat");
  const path = await createCampaign(page, `Campagne Combat ${Date.now()}`);

  await page.goto(`${path}/combat`);
  await expect(page.getByRole("heading", { level: 1, name: /Combat & Initiative/ })).toBeVisible();
  await expect(page.getByText("Hors combat")).toBeVisible();
  await expect(page.getByText("Aucun combattant")).toBeVisible();

  await page.getByPlaceholder("Gobelin, Astarion…").fill("Gobelin");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.getByPlaceholder("Gobelin, Astarion…").fill("Astarion");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Gobelin" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Astarion" })).toBeVisible();

  await page.getByRole("button", { name: "Jeter l'initiative" }).click();
  await expect(page.getByText(/^Tour de /)).toBeVisible();

  // 2 combattants : le premier « suivant » reste au round 1, le deuxième wrap.
  await page.getByRole("button", { name: "Tour suivant" }).click();
  await expect(page.getByText("Round 2")).toHaveCount(0);
  const saved = waitStateSaved(page, 2);
  await page.getByRole("button", { name: "Tour suivant" }).click();
  await saved; // la persistance du round 2 est confirmée avant tout rechargement
  await expect(page.getByText("Round 2")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "Gobelin" })).toBeVisible();
  await expect(page.getByText("Round 2")).toBeVisible();
});

test("combat : les changements du MJ arrivent en direct chez le joueur", async ({
  page,
  browser,
}) => {
  await register(page, uniqueEmail("host-combat"), "MJ Combat");
  const path = await createCampaign(page, `Campagne Sync ${Date.now()}`);
  const invite = ((await inviteCode(page).textContent()) ?? "").trim();
  expect(invite).not.toBe("");

  const ctx = await browser.newContext();
  const player = await ctx.newPage();
  await register(player, uniqueEmail("join-combat"), "Joueur Combat");
  await player.getByPlaceholder("Code d'invitation…").fill(invite);
  await player.getByRole("button", { name: "Rejoindre" }).click();
  await expect(player).toHaveURL(/\/campaign\//);

  // Le joueur est sur la page ET connecté au relais avant l'action du MJ.
  await player.goto(`${path}/combat`);
  await expect(player.getByText("Aucun combattant")).toBeVisible();
  await expect(player.getByText("Temps réel actif")).toBeVisible();
  await expect(player.getByRole("button", { name: "Jeter l'initiative" })).toHaveCount(0);

  await page.goto(`${path}/combat`);
  await page.getByPlaceholder("Gobelin, Astarion…").fill("Spectre");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  // Vu SANS rechargement : relais `plugin:event`.
  await expect(player.getByRole("listitem").filter({ hasText: "Spectre" })).toBeVisible();

  await page.getByRole("button", { name: "Jeter l'initiative" }).click();
  await expect(player.getByText("Tour de Spectre")).toBeVisible();

  await ctx.close();
});
