import { describe, expect, it } from "vitest";
import { noteBlockKindSchema } from "@aetheris/shared";
import { KIND_LABELS, PALETTE_CHIPS, blockContentOf, parsePayload } from "./blocks-dnd";

describe("parsePayload", () => {
  it("lis les trois types de bloc", () => {
    expect(parsePayload(JSON.stringify({ type: "dice", label: "Att", expr: "1d20+3" }))).toEqual({
      type: "dice",
      label: "Att",
      expr: "1d20+3",
    });
    expect(parsePayload(JSON.stringify({ type: "table" }))).toEqual({ type: "table" });
    expect(
      parsePayload(JSON.stringify({ type: "meta", kind: "date", label: "Ère", value: "2024" })),
    ).toEqual({ type: "meta", kind: "date", label: "Ère", value: "2024" });
  });

  it("ne conserve gm que s'il est strictement vrai", () => {
    expect(parsePayload(JSON.stringify({ type: "table", gm: true }))?.gm).toBe(true);
    expect(parsePayload(JSON.stringify({ type: "table", gm: false }))?.gm).toBeUndefined();
    expect(parsePayload(JSON.stringify({ type: "table", gm: "oui" }))?.gm).toBeUndefined();
  });

  it("rejette le JSON corrompu ou incomplet", () => {
    expect(parsePayload(null)).toBeNull();
    expect(parsePayload("")).toBeNull();
    expect(parsePayload("{pas du json")).toBeNull();
    expect(parsePayload('"chaîne"')).toBeNull();
    expect(parsePayload(JSON.stringify({ type: "pastille" }))).toBeNull();
    expect(parsePayload(JSON.stringify({ type: "meta", kind: "inconnu", label: "X" }))).toBeNull();
    expect(parsePayload(JSON.stringify({ type: "meta", kind: "custom" }))).toBeNull();
  });

  it("n'injecte pas de champs inconnus", () => {
    const p = parsePayload(JSON.stringify({ type: "dice", expr: "2d6", __proto__x: 1 }));
    expect(p).toEqual({ type: "dice", expr: "2d6" });
  });
});

describe("blockContentOf", () => {
  it("dice : libellé et expression par défaut", () => {
    expect(blockContentOf({ type: "dice" })).toEqual({
      type: "diceBlock",
      attrs: { label: "Jet", expr: "1d20" },
    });
    expect(blockContentOf({ type: "dice", label: "Init", expr: "1d20+5" })).toEqual({
      type: "diceBlock",
      attrs: { label: "Init", expr: "1d20+5" },
    });
  });

  it("table : attributs laissés aux défauts du schéma", () => {
    expect(blockContentOf({ type: "table" })).toEqual({ type: "tableBlock" });
  });

  it("meta : kind + libellé + valeur", () => {
    expect(
      blockContentOf({ type: "meta", kind: "event", label: "Quête", value: "Nulle part" }),
    ).toEqual({
      type: "metaBlock",
      attrs: { kind: "event", label: "Quête", value: "Nulle part" },
    });
  });
});

describe("PALETTE_CHIPS", () => {
  it("clés uniques et payload toujours analysable", () => {
    const keys = PALETTE_CHIPS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const chip of PALETTE_CHIPS) {
      expect(parsePayload(JSON.stringify(chip.payload)), chip.key).not.toBeNull();
      expect(chip.title.length).toBeGreaterThan(0);
      expect(chip.hint.length).toBeGreaterThan(0);
    }
  });

  it("contient les blocs de base demandés : dés, tableau, valeur", () => {
    expect(PALETTE_CHIPS.map((c) => c.key)).toEqual(
      expect.arrayContaining(["dice", "table", "valeur"]),
    );
  });

  it("presets de campagne : kinds valides dans le schema partagé", () => {
    for (const chip of PALETTE_CHIPS) {
      if (chip.payload.type !== "meta") continue;
      expect(noteBlockKindSchema.safeParse(chip.payload.kind).success, chip.key).toBe(true);
      expect(KIND_LABELS[chip.payload.kind!]).toBeTruthy();
    }
  });
});
