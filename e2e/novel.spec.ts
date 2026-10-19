import { expect, test } from "@playwright/test";
import { register, uniqueEmail } from "./helpers";

test("créer un roman → ajouter un chapitre → autosave « Enregistré »", async ({ page }) => {
  await register(page, uniqueEmail("novel"), "Auteur E2E");

  await page.goto("/novels");
  await page.getByRole("button", { name: /nouveau roman/i }).click();
  const dialog = page.getByRole("dialog", { name: "Créer un roman" });
  await dialog.getByLabel("Titre", { exact: true }).fill(`Roman E2E ${Date.now()}`);
  await dialog.getByRole("button", { name: "Créer", exact: true }).click();
  await expect(page).toHaveURL(/\/novels\/[^/]+/);

  await page.getByRole("button", { name: /nouveau chapitre/i }).click();
  const writeLink = page.getByRole("link", { name: "Écrire" });
  await expect(writeLink).toBeVisible();
  await writeLink.click();
  await expect(page).toHaveURL(/\/chapters\/[^/]+/);

  const editor = page.locator('[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.click();
  await editor.pressSequentially(
    "Il était une fois un chapitre écrit par le test E2E, sauvegardé tout seul.",
  );

  // Autosave debounce 1 s → état « Enregistré ✓ ».
  await expect(page.getByText("Enregistré ✓")).toBeVisible({ timeout: 30_000 });
});
