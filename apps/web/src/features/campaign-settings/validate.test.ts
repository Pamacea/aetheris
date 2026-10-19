import { describe, expect, it } from "vitest";
import { parseCampaignSettings } from "./validate";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("parseCampaignSettings", () => {
  it("accepte un titre valide et applique le défaut gameSystem", () => {
    const result = parseCampaignSettings(form({ title: "La Cité des Cendres" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("La Cité des Cendres");
      expect(result.data.gameSystem).toBe("custom");
      expect(result.data.coverImage).toBeUndefined();
      expect(result.data.logo).toBeUndefined();
    }
  });

  it("renomme le titre et garde le système de jeu choisi", () => {
    const result = parseCampaignSettings(form({ title: "  Les Cendres  ", gameSystem: "dnd5e" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Les Cendres");
      expect(result.data.gameSystem).toBe("dnd5e");
    }
  });

  it("refuse un titre vide, en blanc ou absent", () => {
    expect(parseCampaignSettings(form({ title: "   " })).success).toBe(false);
    expect(parseCampaignSettings(new FormData()).success).toBe(false);
  });

  it("refuse un titre trop long", () => {
    expect(parseCampaignSettings(form({ title: "x".repeat(121) })).success).toBe(false);
  });

  it("couverture / logo vides deviennent absents (effacés en base)", () => {
    const result = parseCampaignSettings(form({ title: "Titre", coverImage: "  ", logo: "" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.coverImage).toBeUndefined();
      expect(result.data.logo).toBeUndefined();
    }
  });

  it("refuse une couverture dépassant la limite partagée", () => {
    const result = parseCampaignSettings(
      form({ title: "Titre", coverImage: "x".repeat(2_000_001) }),
    );
    expect(result.success).toBe(false);
  });

  it("retourne une erreur lisible en français", () => {
    const result = parseCampaignSettings(new FormData());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Titre de campagne requis.");
  });
});
