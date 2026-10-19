import { expect, test } from "@playwright/test";
import { createCampaign, inviteCode, register, uniqueEmail } from "./helpers";

test("inscription → création de campagne → hub titre + code d'invitation", async ({ page }) => {
  const email = uniqueEmail("camp");
  const title = `Campagne E2E ${Date.now()}`;

  await register(page, email, "MJ E2E");
  const campaignPath = await createCampaign(page, title);

  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(inviteCode(page)).not.toBeEmpty();
  expect(campaignPath).toContain("/campaign/");
});

test("rejoindre une campagne par code d'invitation", async ({ page, browser }) => {
  const title = `Campagne Join ${Date.now()}`;
  const invite = await (async () => {
    await register(page, uniqueEmail("host"), "MJ Join");
    await createCampaign(page, title);
    return ((await inviteCode(page).textContent()) ?? "").trim();
  })();
  expect(invite).not.toBe("");

  const ctx = await browser.newContext();
  const player = await ctx.newPage();
  await register(player, uniqueEmail("join"), "Joueur Join");
  await player.getByPlaceholder("Code d'invitation…").fill(invite);
  await player.getByRole("button", { name: "Rejoindre" }).click();
  await expect(player).toHaveURL(/\/campaign\//);
  await expect(player.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await ctx.close();
});
