import { describe, expect, it } from "vitest";
import { parseCreateCampaign } from "./validate";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("parseCreateCampaign", () => {
  it("accepte un titre valide et applique les défauts", () => {
    const result = parseCreateCampaign(form({ title: "La Cité des Cendres" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("La Cité des Cendres");
      expect(result.data.theme).toBe("pandemonium");
      expect(result.data.gameSystem).toBe("custom");
    }
  });

  it("refuse un titre vide ou absent", () => {
    expect(parseCreateCampaign(form({ title: "   " })).success).toBe(false);
    expect(parseCreateCampaign(new FormData()).success).toBe(false);
  });

  it("refuse un titre trop long", () => {
    expect(parseCreateCampaign(form({ title: "x".repeat(121) })).success).toBe(false);
  });

  it("retourne une erreur lisible en français", () => {
    const result = parseCreateCampaign(new FormData());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.length).toBeGreaterThan(0);
  });
});
