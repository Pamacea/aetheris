import { describe, expect, it } from "vitest";
import { noteBlockKindSchema } from "@aetheris/shared";
import { PALETTE_SECTIONS } from "./block-defs";
import { KIND_LABELS, blockContentOf, insertionTarget, parsePayload } from "./blocks-dnd";

describe("parsePayload", () => {
  it("lis les trois types de bloc structurés", () => {
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

  it("lis les blocs texte typés", () => {
    expect(parsePayload(JSON.stringify({ type: "heading", level: 2 }))).toEqual({
      type: "heading",
      level: 2,
    });
    expect(parsePayload(JSON.stringify({ type: "paragraph" }))).toEqual({ type: "paragraph" });
    expect(parsePayload(JSON.stringify({ type: "gmSecret" }))).toEqual({ type: "gmSecret" });
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
    expect(parsePayload(JSON.stringify({ type: "heading" }))).toBeNull();
    expect(parsePayload(JSON.stringify({ type: "heading", level: 4 }))).toBeNull();
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

  it("blocs texte : vrais nœuds StarterKit", () => {
    expect(blockContentOf({ type: "heading", level: 2 })).toEqual({
      type: "heading",
      attrs: { level: 2 },
    });
    expect(blockContentOf({ type: "paragraph" })).toEqual({ type: "paragraph" });
    expect(blockContentOf({ type: "blockquote" })).toEqual({
      type: "blockquote",
      content: [{ type: "paragraph" }],
    });
    expect(blockContentOf({ type: "bulletList" })).toEqual({
      type: "bulletList",
      content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
    });
    expect(blockContentOf({ type: "orderedList" })).toEqual({
      type: "orderedList",
      content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
    });
    expect(blockContentOf({ type: "horizontalRule" })).toEqual({ type: "horizontalRule" });
    expect(blockContentOf({ type: "gmSecret" })).toEqual({
      type: "gmSecret",
      content: [{ type: "paragraph" }],
    });
  });
});

describe("insertionTarget", () => {
  it("remplace une sélection non vide", () => {
    expect(insertionTarget(null, { from: 3, to: 8 }, 20)).toEqual({ from: 3, to: 8 });
  });

  it("insère au curseur", () => {
    expect(insertionTarget(null, { from: 5, to: 5 }, 20)).toEqual({ from: 5, to: 5 });
  });

  it("retombe en fin de document sans sélection enregistrée", () => {
    expect(insertionTarget(null, null, 20)).toEqual({ from: 20, to: 20 });
  });

  it("respecte une position de drop explicite", () => {
    expect(insertionTarget(7, { from: 5, to: 5 }, 20)).toEqual({ from: 7, to: 7 });
  });
});

describe("PALETTE_SECTIONS", () => {
  const defs = PALETTE_SECTIONS.flatMap((section) => section.blocks);

  it("sections groupées et identifiants uniques", () => {
    expect(PALETTE_SECTIONS.map((s) => s.id)).toEqual(["text", "sheet", "gm", "preset"]);
    const ids = defs.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("expose les blocs demandés avec libellé + description", () => {
    expect(defs.map((d) => d.label)).toEqual(
      expect.arrayContaining([
        "Titre 1",
        "Titre 2",
        "Titre 3",
        "Paragraphe",
        "Citation",
        "Liste à puces",
        "Liste numérotée",
        "Filet",
        "Propriétés clé-valeur",
        "Jet de dés",
        "Tableau",
        "Bloc secret MJ",
      ]),
    );
    for (const def of defs) {
      expect(def.description.length, def.id).toBeGreaterThan(0);
      expect(parsePayload(JSON.stringify(def.payload)), def.id).not.toBeNull();
      expect(blockContentOf(def.payload).type, def.id).toBeTruthy();
    }
  });

  it("le chip Propriétés crée un metaBlock avec un libellé par défaut", () => {
    const def = defs.find((d) => d.id === "properties");
    expect(def?.payload).toMatchObject({ type: "meta", label: "Propriété" });
    expect(blockContentOf(def!.payload)).toMatchObject({
      type: "metaBlock",
      attrs: { label: "Propriété" },
    });
  });

  it("presets de campagne : kinds valides dans le schema partagé", () => {
    for (const def of defs) {
      if (def.payload.type !== "meta") continue;
      expect(noteBlockKindSchema.safeParse(def.payload.kind).success, def.id).toBe(true);
      expect(KIND_LABELS[def.payload.kind!]).toBeTruthy();
    }
  });
});
