import { expect, test } from "@playwright/test";
import { createCampaign, register, uniqueEmail } from "./helpers";

test("inscription → création de campagne → hub titre + code d'invitation", async ({ page }) => {
  const email = uniqueEmail("camp");
  const title = `Campagne E2E ${Date.now()}`;

  await register(page, email, "MJ E2E");
  const campaignPath = await createCampaign(page, title);

  // Hub : titre en h1 + code d'invitation visible par le MJ
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  const invite = page.locator("p", { hasText: "Code d'invitation" }).locator("code");
  await expect(invite).not.toBeEmpty();
  expect(campaignPath).toContain("/campaign/");
});

test("rejoindre une campagne par code d'invitation", async ({ page, browser }) => {
  const title = `Campagne Join ${Date.now()}`;
  const inviteCode = await (async () => {
    await register(page, uniqueEmail("host"), "MJ Join");
    await createCampaign(page, title);
    const code = page.locator("p", { hasText: "Code d'invitation" }).locator("code");
    return (await code.textContent())?.trim() ?? "";
  })();
  expect(inviteCode).not.toBe("");

  // Deuxième compte : rejoint via le formulaire du dashboard.
  const ctx = await browser.newContext();
  const player = await ctx.newPage();
  await register(player, uniqueEmail("join"), "Joueur Join");
  await player.getByPlaceholder("Code d'invitation…").fill(inviteCode);
  await player.getByRole("button", { name: "Rejoindre" }).click();
  await expect(player).toHaveURL(/\/campaign\//);
  await expect(player.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await ctx.close();
});
