import { describe, expect, it } from "vitest";
import { noteBlockKindSchema } from "@aetheris/shared";
import { GM_BLOCK_DEFS, PALETTE_SECTIONS, SHEET_BLOCK_DEFS, TEXT_BLOCK_DEFS } from "./block-defs";
import {
  BLOCK_PRESETS,
  createSlashExtension,
  createWikiLinkExtension,
  filterSlashItems,
  slashItems,
  wikiLinkItems,
} from "./extensions";

const BASE = slashItems(false);
const BASE_COUNT = TEXT_BLOCK_DEFS.length + SHEET_BLOCK_DEFS.length;
const PRESET_TOTAL = BLOCK_PRESETS.reduce((n, p) => n + p.items.length, 0);

describe("BLOCK_PRESETS", () => {
  it("tous les kinds sont valides dans le schema partagé", () => {
    for (const pack of BLOCK_PRESETS) {
      expect(pack.pack.length).toBeGreaterThan(0);
      for (const item of pack.items) {
        expect(noteBlockKindSchema.safeParse(item.kind).success, item.title).toBe(true);
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.label.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("slashItems", () => {
  it("joueur : blocs de base + presets, aucune variante MJ", () => {
    // 8 formats de texte + 3 blocs de fiche + presets ×1.
    expect(BASE).toHaveLength(BASE_COUNT + PRESET_TOTAL);
    expect(BASE.some((i) => i.title.includes("MJ"))).toBe(false);
    expect(BASE.some((i) => i.title === "Titre 1")).toBe(true);
  });

  it("blocs automatisés : jet de dés et tableau exposés au menu slash", () => {
    expect(BASE.map((i) => i.title)).toContain("Jet de dés");
    expect(BASE.map((i) => i.title)).toContain("Tableau");
  });

  it("expose le bloc Propriétés clé-valeur", () => {
    expect(BASE.map((i) => i.title)).toContain("Propriétés clé-valeur");
  });

  it("le preset Texte est remplacé par le bloc Paragraphe", () => {
    expect(BASE.map((i) => i.title)).not.toContain("Texte");
    expect(BASE.map((i) => i.title)).toContain("Paragraphe");
  });

  it("MJ : + commande secret + variante MJ de chaque preset", () => {
    const gm = slashItems(true);
    expect(gm).toHaveLength(BASE_COUNT + GM_BLOCK_DEFS.length + PRESET_TOTAL * 2);
    expect(gm.some((i) => i.title === "Bloc secret MJ")).toBe(true);
    for (const pack of BLOCK_PRESETS) {
      for (const item of pack.items) {
        expect(gm.some((i) => i.title === `${item.title} (MJ seulement)`)).toBe(true);
      }
    }
  });
});

describe("source unique palette / slash", () => {
  it("chaque entrée de la palette existe dans le menu slash", () => {
    const slash = new Set(slashItems(true).map((i) => i.title));
    for (const section of PALETTE_SECTIONS) {
      for (const def of section.blocks) {
        expect(slash.has(def.label), def.id).toBe(true);
      }
    }
  });
});

describe("filterSlashItems", () => {
  it("filtre insensiblement à la casse sur title et hint", () => {
    expect(filterSlashItems(BASE, "").length).toBe(BASE.length);
    expect(filterSlashItems(BASE, "H1")[0]?.title).toBe("Titre 1");
    expect(filterSlashItems(BASE, "puces").map((i) => i.title)).toEqual(["Liste à puces"]);
    expect(filterSlashItems(BASE, "TITRE 2").map((i) => i.title)).toEqual(["Titre 2"]);
    expect(filterSlashItems(BASE, "nawak")).toEqual([]);
  });
});

describe("wikiLinkItems", () => {
  const notes = [
    { id: "1", title: "Brûlor" },
    { id: "2", title: "Brûlage" },
    { id: "3", title: "Sanctuaire" },
  ];

  it("filtre insensiblement à la casse", () => {
    const existing = (q: string) =>
      wikiLinkItems(notes, q)
        .filter((n) => !n.isNew)
        .map((n) => n.title);
    expect(existing("brûl")).toEqual(["Brûlor", "Brûlage"]);
    expect(existing("BRÛL")).toEqual(["Brûlor", "Brûlage"]);
  });

  it("q vide : aucun isNew, tout est proposé", () => {
    const r = wikiLinkItems(notes, "");
    expect(r.every((n) => !n.isNew)).toBe(true);
    expect(r).toHaveLength(3);
  });

  it("q non résolu : propose la création (isNew), résolu : pas de doublon", () => {
    const created = wikiLinkItems(notes, "  Tortue  ");
    expect(created.at(-1)).toMatchObject({ title: "Tortue", isNew: true });
    const exact = wikiLinkItems(notes, "brûlor");
    expect(exact.some((n) => n.isNew)).toBe(false);
  });

  it("borné à 8 correspondances", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: String(i), title: `Note ${i}` }));
    const r = wikiLinkItems(many, "note");
    expect(r.filter((n) => !n.isNew)).toHaveLength(8);
  });
});

describe("extensions", () => {
  it("créent des extensions tiptap nommées", () => {
    expect(createSlashExtension({ isGM: false }).name).toBe("slashSuggestion");
    expect(createSlashExtension({ isGM: true }).name).toBe("slashSuggestion");
    expect(createWikiLinkExtension(notesOf()).name).toBe("wikiLinkSuggestion");
  });
});

function notesOf() {
  return [{ id: "1", title: "Note" }];
}
