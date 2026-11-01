import { expect, test } from "@playwright/test";
import { E2E_TITLE_PREFIX, createCampaign, inviteCode, register, uniqueEmail } from "./helpers";

test("inscription → création de campagne → table + code d'invitation", async ({ page }) => {
  const email = uniqueEmail("camp");
  const title = `Campagne E2E ${Date.now()}`;

  await register(page, email, "MJ E2E");
  const campaignPath = await createCampaign(page, title);

  // La table de jeu remplace le hub : l'URL et le bureau VTT le confirment.
  await expect(page).toHaveURL(/\/campaign\/[^/]+\/vtt/);
  await expect(page.getByRole("navigation", { name: "Dock des modules" })).toBeVisible();

  // Le titre et le code d'invitation vivent désormais dans les réglages.
  await page.goto(`${campaignPath}/settings?embed=1`);
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue(
    `${E2E_TITLE_PREFIX}${title}`,
  );
  await expect(inviteCode(page)).not.toBeEmpty();
  expect(campaignPath).toContain("/campaign/");
});

test("rejoindre une campagne par code d'invitation", async ({ page, browser }) => {
  const title = `Campagne Join ${Date.now()}`;
  let campaignPath = "";
  const invite = await (async () => {
    await register(page, uniqueEmail("host"), "MJ Join");
    campaignPath = await createCampaign(page, title);
    await page.goto(`${campaignPath}/settings?embed=1`);
    return ((await inviteCode(page).textContent()) ?? "").trim();
  })();
  expect(invite).not.toBe("");

  const ctx = await browser.newContext();
  const player = await ctx.newPage();
  await register(player, uniqueEmail("join"), "Joueur Join");
  await player.getByRole("button", { name: "Rejoindre" }).click();
  const dialog = player.getByRole("dialog", { name: "Rejoindre une campagne" });
  await dialog.getByPlaceholder("Code d'invitation…").fill(invite);
  await dialog.getByRole("button", { name: "Rejoindre" }).click();
  await expect(player).toHaveURL(/\/campaign\/[^/]+\/vtt/);
  await expect(player.getByRole("navigation", { name: "Dock des modules" })).toBeVisible();

  // Le joueur a bien rejoint LA campagne invitée (titre en lecture seule).
  await player.goto(`${campaignPath}/settings?embed=1`);
  await expect(player.getByLabel("Titre", { exact: true })).toHaveValue(
    `${E2E_TITLE_PREFIX}${title}`,
  );
  await ctx.close();
});
