import { describe, expect, it, vi } from "vitest";
import { templateSchemaSchema, type NoteBlock, type TemplateSchema } from "@aetheris/shared";
import { evalMacroBlock, scopeOfBlock } from "./blocks-scopes";

// Server action (prisma / next/cache) : jamais chargée dans le test.
vi.mock("../vtt/actions", () => ({ getWikiFiche: vi.fn() }));

const schema: TemplateSchema = templateSchemaSchema.parse({
  fields: [
    { id: "force", label: "Force", kind: "number" },
    { id: "pv", label: "PV", kind: "counter" },
  ],
});

const bloc = (surcharge: Partial<NoteBlock> = {}): NoteBlock => ({
  id: "b1",
  kind: "macro",
  label: "Test",
  value: "",
  ...surcharge,
});

const charge = { fiche1: { schema, data: { force: 12, pv: 30 } } };
const horsLigne = { fiche1: { schema: null, data: {} } };

const opts = (
  surcharge: Partial<{
    isGM: boolean;
    scopeError: string | null;
    noteId: string | null;
    noteType: string;
  }> = {},
) => ({
  isGM: true,
  scopeError: null,
  noteId: "fiche1",
  noteType: "fiche",
  ...surcharge,
});

describe("scopeOfBlock", () => {
  it("portée numérique de la fiche source", () => {
    expect(scopeOfBlock(charge, bloc({ expr: "force+1" }), "fiche1", "fiche")).toEqual({
      force: 12,
      pv: 30,
    });
  });

  it("null quand la fiche source n'est pas chargée", () => {
    expect(scopeOfBlock({}, bloc({ expr: "force" }), "fiche1", "fiche")).toBeNull();
  });

  it("null pour un bloc hors fiche (note libre sans refNoteId)", () => {
    expect(scopeOfBlock(charge, bloc({ expr: "force" }), "n1", "note")).toBeNull();
  });

  it("refNoteId explicite prime sur la note courante", () => {
    expect(scopeOfBlock(charge, bloc({ refNoteId: "fiche1" }), "n1", "note")).toEqual({
      force: 12,
      pv: 30,
    });
  });

  it("null quand le schéma de la fiche est illisible", () => {
    expect(scopeOfBlock(horsLigne, bloc({ expr: "force" }), "fiche1", "fiche")).toBeNull();
  });
});

describe("evalMacroBlock", () => {
  it("bloc sans valeur : null (rien à afficher)", () => {
    expect(evalMacroBlock(charge, bloc(), opts())).toBeNull();
    expect(evalMacroBlock(charge, bloc({ expr: "" }), opts())).toBeNull();
  });

  it("fiche pas encore chargée : « … »", () => {
    expect(evalMacroBlock({}, bloc({ expr: "force" }), opts())).toBe("…");
  });

  it("expression évaluée et arrondie à 2 décimales", () => {
    expect(evalMacroBlock(charge, bloc({ expr: "force + 5" }), opts())).toBe("17");
    expect(evalMacroBlock(charge, bloc({ expr: "force / 7" }), opts())).toBe("1.71");
  });

  it("expression invalide : détaillée pour le MJ, neutre pour le joueur", () => {
    const invalide = bloc({ expr: "force +" });
    expect(evalMacroBlock(charge, invalide, opts({ isGM: true }))).toBe("Expression invalide");
    expect(evalMacroBlock(charge, invalide, opts({ isGM: false }))).toBe("—");
  });

  it("fiche introuvable : le MJ voit l'erreur, pas le joueur", () => {
    const b = bloc({ expr: "force" });
    expect(evalMacroBlock(horsLigne, b, opts({ isGM: true }))).toBe("Fiche introuvable");
    expect(evalMacroBlock(horsLigne, b, opts({ isGM: true, scopeError: "Accès refusé" }))).toBe(
      "Fiche introuvable — Accès refusé",
    );
    expect(evalMacroBlock(horsLigne, b, opts({ isGM: false, scopeError: "Accès refusé" }))).toBe(
      "Fiche introuvable",
    );
  });

  it("bloc non-macro sans expr ni fiche : null avant tout message", () => {
    expect(evalMacroBlock({}, bloc({ kind: "date", expr: undefined }), opts())).toBeNull();
  });
});
