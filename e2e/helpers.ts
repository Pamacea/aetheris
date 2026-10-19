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

/** Crée une campagne via le formulaire inline du dashboard et renvoie son chemin.
 *  L'action redirige directement vers le hub de la campagne créée. */
export async function createCampaign(page: Page, title: string) {
  await page.getByPlaceholder("Titre de la campagne…").fill(title);
  await page.getByRole("button", { name: "Nouvelle campagne" }).click();
  await expect(page).toHaveURL(/\/campaign\//);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  return new URL(page.url()).pathname;
}

/** Code d'invitation affiché dans le hub (MJ uniquement). */
export function inviteCode(page: Page) {
  return page.locator("code").first();
}

/** Lien de module dans la top bar fusionnée (les cartes du hub portent le
 *  même nom accessible → scoping obligatoire contre le conflit strict). */
export function moduleLink(page: Page, name: string | RegExp) {
  return page
    .getByRole("navigation", { name: "Modules de la campagne" })
    .getByRole("link", { name });
}
