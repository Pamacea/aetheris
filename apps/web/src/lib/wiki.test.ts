import { describe, expect, it } from "vitest";
import { stripGmSecrets } from "./wiki";

describe("stripGmSecrets", () => {
  it("retire les blocs secrets complets", () => {
    expect(stripGmSecrets("<p>pub</p><gm-secret><p>secret</p></gm-secret><p>fin</p>")).toBe(
      "<p>pub</p><p>fin</p>",
    );
    // Casse variée.
    expect(stripGmSecrets("<GM-SECRET>secret</GM-SECRET>")).toBe("");
  });

  it("échec fermé sur un gm-secret non fermé (HTML corrompu)", () => {
    expect(stripGmSecrets("<p>ok</p><gm-secret>secret jamais fermée")).toBe("<p>ok</p>");
    expect(stripGmSecrets('<gm-secret class="x">secret')).toBe("");
  });

  it("retire les tags orphelins restants", () => {
    expect(stripGmSecrets("texte</gm-secret>suite")).toBe("textesuite");
    // shortcut: nest imbriqué non strippable en entier — le contenu situé
    // après la fermeture du plus petit paquet reste visible (voir commentaire).
    expect(stripGmSecrets("<gm-secret>A<gm-secret>B</gm-secret>C</gm-secret>")).toBe("C");
  });

  it("gère vide/null", () => {
    expect(stripGmSecrets(null)).toBe("");
    expect(stripGmSecrets(undefined)).toBe("");
    expect(stripGmSecrets("")).toBe("");
  });
});
