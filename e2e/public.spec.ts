import { expect, test, type Browser, type Page } from "@playwright/test";
import { createCampaign, openModule, register, uniqueEmail } from "./helpers";

/** Libellés de la nav affichés uniquement pour une session connectée. */
const CONNECTED_NAV_LABELS = ["Tableau de bord", "Studio d'écriture", "Profil"] as const;

/** Contexte neuf sans cookies : visiteur anonyme, même après un register. */
async function asAnonymous(browser: Browser, run: (page: Page) => Promise<void>) {
  const context = await browser.newContext();
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

async function expectNoConnectedNav(page: Page) {
  for (const label of CONNECTED_NAV_LABELS) {
    await expect(page.getByText(label, { exact: true })).toHaveCount(0);
  }
}

async function registerAuthor(page: Page, tag: string) {
  await register(page, uniqueEmail(tag), "Auteur Public");
}

/** Crée un roman via l'UI puis le publie (Brouillon → En écriture → Publié). */
async function createPublishedNovel(page: Page, title: string): Promise<string> {
  await page.goto("/novels");
  await page.getByRole("button", { name: "+ Nouveau roman" }).click();
  await page.getByPlaceholder("Les Cendres d'Aetheris").fill(title);
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await expect(page).toHaveURL(/\/novels\/[^/]+$/);

  const status = page.getByRole("button", { name: /Statut du roman/ });
  await expect(status).toContainText("Brouillon");
  await status.click();
  await expect(status).toContainText("En écriture");
  await status.click();
  await expect(status).toContainText("Publié");
  return new URL(page.url()).pathname;
}

test.describe("visiteur anonyme", () => {
  test("la bibliothèque est publique et sans chrome connecté", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByRole("heading", { level: 1, name: "Bibliothèque" })).toBeVisible();
    await expect(page.getByText("Chargement…")).toHaveCount(0);
    await expectNoConnectedNav(page);
    await expect(page.getByRole("link", { name: "Se connecter", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Créer un compte", exact: true })).toBeVisible();
  });

  test("/dashboard redirige vers /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("/profile redirige vers /login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("contenus publics", () => {
  test("un roman publié est lisible anonymement", async ({ page, browser }) => {
    await registerAuthor(page, "public-novel");
    const title = `Roman public ${Date.now()}`;
    const path = await createPublishedNovel(page, title);

    await asAnonymous(browser, async (anon) => {
      await anon.goto(path);
      await expect(anon.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expectNoConnectedNav(anon);
      await expect(anon.getByRole("link", { name: "Se connecter", exact: true })).toBeVisible();
    });
  });

  test("un lien de partage en lecture s'ouvre anonymement", async ({ page, browser }) => {
    await registerAuthor(page, "public-share");
    const title = `Roman partagé ${Date.now()}`;
    await createPublishedNovel(page, title);

    await page.getByRole("button", { name: "Partage", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Partage du roman" })).toBeVisible();
    await page.getByRole("button", { name: /^Lecture/ }).click();

    const shareInput = page.getByLabel("Lien de partage");
    await expect(shareInput).toHaveValue(/\/shared\/novel\/[^/]+$/);
    const path = new URL(await shareInput.inputValue()).pathname;

    await asAnonymous(browser, async (anon) => {
      await anon.goto(path);
      await expect(anon.getByRole("heading", { level: 1, name: title })).toBeVisible();
    });
  });

  test("un wiki partagé s'ouvre anonymement", async ({ page, browser }) => {
    await registerAuthor(page, "public-wiki");
    await createCampaign(page, `Campagne publique ${Date.now()}`);
    await openModule(page, "wiki");

    const entryTitle = `Entrée partagée ${Date.now()}`;
    await page.getByRole("button", { name: "+ Nouvelle" }).click();
    await page.getByPlaceholder("Titre de l'entrée").fill(entryTitle);
    await page.getByRole("button", { name: "Créer", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: entryTitle })).toBeVisible();

    await page.getByRole("button", { name: "Partager l’entrée" }).click();
    await page.getByRole("button", { name: "Activer le partage" }).click();
    const sharedLink = page.getByRole("link", { name: /^\/shared\// });
    await expect(sharedLink).toBeVisible();
    const href = await sharedLink.getAttribute("href");
    expect(href).toMatch(/^\/shared\/[^/]+$/);

    await asAnonymous(browser, async (anon) => {
      await anon.goto(href!);
      await expect(anon.getByRole("heading", { level: 1, name: entryTitle })).toBeVisible();
    });
  });
});
