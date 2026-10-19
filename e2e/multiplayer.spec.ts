import { expect, test } from "@playwright/test";
import { createCampaign, login, register, uniqueEmail } from "./helpers";

/**
 * 2 contextes navigateur dans la même campagne : le MJ jette les dés dans
 * le chat de la VTT, le 2e client voit le résultat (broadcast temps réel).
 *
 * shortcut: aucun flow « rejoindre par code d'invitation » côté joueur dans
 * le dashboard → les 2 contextes partagent le même compte ; upgrade: spec
 * avec 2 comptes dès que l'invitation joueur existe.
 */
test("session 2 clients : le jet de dés du MJ apparaît chez le 2e client", async ({ browser }) => {
  const email = uniqueEmail("mp");
  const title = `Campagne MP ${Date.now()}`;

  const gmContext = await browser.newContext();
  const gm = await gmContext.newPage();
  await register(gm, email, "MJ Multi");
  const campaignPath = await createCampaign(gm, title);

  const playerContext = await browser.newContext();
  const player = await playerContext.newPage();
  await login(player, email);
  await player.goto(`${campaignPath}/vtt`);
  await gm.goto(`${campaignPath}/vtt`);

  // Les deux sockets doivent avoir rejoint la room de campagne.
  await expect(gm.getByText("Connecté", { exact: true })).toBeVisible();
  await expect(player.getByText("Connecté", { exact: true })).toBeVisible();

  await gm.getByRole("textbox", { name: "Message", exact: true }).fill("/roll 1d20");
  await gm.getByRole("button", { name: "Envoyer" }).click();

  // Le résultat du jet (« → n = n ») arrive par WebSocket chez le 2e client.
  await expect(player.getByText(/jette/)).toBeVisible();
  await expect(player.getByText(/→\s*\d+\s*=\s*\d+/)).toBeVisible();

  await gmContext.close();
  await playerContext.close();
});
