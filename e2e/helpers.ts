import { expect, type Page } from "@playwright/test";

export const PASSWORD = "E2ePass123!";

/** Préfixe des campagnes créées par les E2E (repérage dans le dashboard). */
export const E2E_TITLE_PREFIX = "[E2E] ";

/** Email unique sur un domaine dédié, cible du script de nettoyage. */
export function uniqueEmail(tag: string): string {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@e2e.aetheris.test`;
}

/** Inscription → redirige vers /dashboard. */
export async function register(page: Page, email: string, name: string) {
  await page.goto("/register");
  // Attendre l'hydratation : sans elle, le submit part en GET natif.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nom", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Connexion d'un compte existant → redirige vers /dashboard. */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Crée une campagne via la modale « Nouvelle campagne » du dashboard.
 *  L'action redirige vers `/campaign/<id>`, qui redirige vers la table (`/vtt`).
 *  Renvoie le chemin de base `/campaign/<id>`. */
export async function createCampaign(page: Page, title: string) {
  await page.getByRole("button", { name: "+ Nouvelle campagne" }).click();
  await page.getByPlaceholder("Titre de la campagne…").fill(`${E2E_TITLE_PREFIX}${title}`);
  // Assistant en deux étapes : identité puis système de jeu (sélection obligatoire).
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await page
    .getByRole("radiogroup", { name: "Systèmes de jeu" })
    .getByRole("radio")
    .first()
    .click();
  await page.getByRole("button", { name: "Créer la campagne" }).click();
  await expect(page).toHaveURL(/\/campaign\/[^/]+\/vtt/);
  // Plus de hub : on attend un élément stable du bureau de la table.
  await expect(page.getByRole("navigation", { name: "Dock des modules" })).toBeVisible();
  return campaignBasePath(page);
}

/** Chemin de base de la campagne courante (`/campaign/<id>`). */
export function campaignBasePath(page: Page): string {
  const match = new URL(page.url()).pathname.match(/^\/campaign\/[^/]+/);
  if (!match) throw new Error(`Page hors campagne : ${page.url()}`);
  return match[0];
}

/** Ouvre un module de campagne en pleine page.
 *  Le top-nav n'a plus de menu de modules : navigation directe ; `embed=1`
 *  rend la page hors bureau (sans lui, la route module redirige vers la table
 *  et ouvre une fenêtre iframe). */
export async function openModule(page: Page, slug: string): Promise<string> {
  const base = campaignBasePath(page);
  await page.goto(slug === "vtt" ? `${base}/vtt` : `${base}/${slug}?embed=1`);
  return base;
}

/** Code d'invitation affiché dans les réglages de la campagne (MJ uniquement).
 *  Scopé à sa section : l'éditeur de thème contient aussi un `<code>`. */
export function inviteCode(page: Page) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Code d'invitation" }) })
    .locator("code")
    .first();
}
