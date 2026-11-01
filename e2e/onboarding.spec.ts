import { expect, test } from "@playwright/test";
import { openModule, register, uniqueEmail } from "./helpers";

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail("onboarding"), "MJ Démo");
});

test("campagne de démonstration : seed visible et retour au dashboard", async ({ page }) => {
  await page.getByRole("button", { name: "Campagne de démonstration" }).click();

  // Le seed (wiki + handout + modèle + scène) peut prendre plusieurs secondes.
  await expect(page).toHaveURL(/\/campaign\/[^/]+\/vtt/, { timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "Dock des modules" })).toBeVisible();

  // Les notes seedées apparaissent dans le panneau d'entrées du wiki.
  await openModule(page, "wiki");
  await expect(page).toHaveURL(/\/wiki/);
  await expect(page.getByRole("button", { name: "Le Village de Brumebois" }).first()).toBeVisible();

  // De retour au dashboard, la campagne démo est listée.
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /Campagne de démonstration/ })).toBeVisible();
});

test("upload : 200 avec stockage, 503 explicite sinon, jamais 500", async ({ page }) => {
  await page.goto("/dashboard");

  const result = await page.evaluate(async () => {
    // PNG minimal : signature valide + quelques octets (la route ne lit que 16 octets).
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const form = new FormData();
    form.append("file", new File([png], "test.png", { type: "image/png" }));
    form.append("purpose", "cover");
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const body = (await res.json()) as { url?: string; error?: string };
    return { status: res.status, url: body.url ?? "", error: body.error ?? "" };
  });

  // Un store est configuré en local et sur Vercel ; en CI (aucun token), le refus doit
  // rester un JSON 503 exploitable plutôt qu'un 500 sans corps.
  if (result.status === 200) {
    expect(result.url).toMatch(/^https:\/\//);
    return;
  }
  expect(result.status).toBe(503);
  expect(result.error).toContain("Stockage d'images non configuré");
});
