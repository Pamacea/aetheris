import { describe, expect, it } from "vitest";
import { GM_BLOCK_DEFS, PALETTE_SECTIONS, SHEET_BLOCK_DEFS, TEXT_BLOCK_DEFS } from "./block-defs";
import {
  createSlashExtension,
  createWikiLinkExtension,
  filterSlashItems,
  slashItems,
  wikiLinkItems,
} from "./extensions";

const BASE = slashItems(false);
const BASE_COUNT = TEXT_BLOCK_DEFS.length + SHEET_BLOCK_DEFS.length;

describe("slashItems", () => {
  it("joueur : blocs de texte et JDR, aucun bloc MJ", () => {
    expect(BASE).toHaveLength(BASE_COUNT);
    expect(BASE.some((i) => i.title === "Bloc secret MJ")).toBe(false);
    expect(BASE.some((i) => i.title === "Titre 1")).toBe(true);
  });

  it("blocs automatisés : jet de dés et tableau exposés au menu slash", () => {
    expect(BASE.map((i) => i.title)).toContain("Jet de dés");
    expect(BASE.map((i) => i.title)).toContain("Tableau de stats");
  });

  it("plus de blocs clé-valeur hérités", () => {
    expect(BASE.map((i) => i.title)).not.toContain("Propriétés clé-valeur");
  });

  it("MJ : ajoute le bloc secret", () => {
    const gm = slashItems(true);
    expect(gm).toHaveLength(BASE_COUNT + GM_BLOCK_DEFS.length);
    expect(gm.some((i) => i.title === "Bloc secret MJ")).toBe(true);
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

  it("trois sections : texte, JDR, MJ", () => {
    expect(PALETTE_SECTIONS.map((s) => s.id)).toEqual(["text", "sheet", "gm"]);
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
