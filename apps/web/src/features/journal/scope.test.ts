import { describe, expect, it } from "vitest";
import { journalScope } from "./scope";

describe("journalScope", () => {
  it("MJ : campagne uniquement (brouillons inclus)", () => {
    expect(journalScope("c1", true)).toEqual({ campaignId: "c1" });
  });

  it("Joueur : campagne + shared=true (brouillons exclus)", () => {
    expect(journalScope("c1", false)).toEqual({ campaignId: "c1", shared: true });
  });
});
