import { describe, expect, it } from "vitest";
import { fieldWidthSpan, fieldWidthToken } from "@aetheris/shared";

describe("fieldWidthToken", () => {
  it("normalise les anciennes valeurs sm/md/full", () => {
    expect(fieldWidthToken("sm", "text")).toBe("1/4");
    expect(fieldWidthToken("md", "text")).toBe("1/2");
    expect(fieldWidthToken("full", "text")).toBe("full");
    expect(fieldWidthToken("3/4", "text")).toBe("3/4");
  });

  it("conserve le tiers", () => {
    expect(fieldWidthToken("1/3", "text")).toBe("1/3");
  });

  it("défaut : nombre/compteur court, autres champs pleine largeur", () => {
    expect(fieldWidthToken(undefined, "number")).toBe("1/4");
    expect(fieldWidthToken(undefined, "counter")).toBe("1/4");
    expect(fieldWidthToken(undefined, "text")).toBe("full");
    expect(fieldWidthToken(undefined, "ability")).toBe("full");
  });
});

describe("fieldWidthSpan", () => {
  it("mappe chaque largeur sur des douzièmes de colonne", () => {
    expect(fieldWidthSpan("1/4", "text")).toBe(3);
    expect(fieldWidthSpan("1/3", "text")).toBe(4);
    expect(fieldWidthSpan("1/2", "text")).toBe(6);
    expect(fieldWidthSpan("3/4", "text")).toBe(9);
    expect(fieldWidthSpan("full", "text")).toBe(12);
    // Rétrocompatibilité des valeurs historiques.
    expect(fieldWidthSpan("sm", "text")).toBe(3);
    expect(fieldWidthSpan("md", "text")).toBe(6);
  });

  it("défauts : nombre/compteur courts, autres pleine largeur", () => {
    expect(fieldWidthSpan(undefined, "number")).toBe(3);
    expect(fieldWidthSpan(undefined, "counter")).toBe(3);
    expect(fieldWidthSpan(undefined, "text")).toBe(12);
  });
});
