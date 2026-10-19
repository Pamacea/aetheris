import { expect, type Page } from "@playwright/test";

export const PASSWORD = "E2ePass123!";

/** Email unique par exécution pour ne pas polluer la base de dev. */
export function uniqueEmail(tag: string): string {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
}

/** Inscription → redirige vers /dashboard. */
export async function register(page: Page, email: string, name: string) {
  await page.goto("/register");
  await page.getByLabel("Nom", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Connexion d'un compte existant → redirige vers /dashboard. */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Crée une campagne depuis le dashboard et renvoie son chemin. */
export async function createCampaign(page: Page, title: string) {
  await page.getByRole("button", { name: /créer une campagne/i }).click();
  const dialog = page.getByRole("dialog", { name: "Créer une campagne" });
  await dialog.getByLabel("Nom de la campagne").fill(title);
  await dialog.getByRole("button", { name: "Valider" }).click();
  await expect(dialog).toBeHidden();
  const card = page.getByRole("link", { name: title });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/campaign\//);
  return new URL(page.url()).pathname;
}
