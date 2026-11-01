import { describe, expect, it } from "vitest";
import {
  combatEntityData,
  entityCombat,
  entityName,
  entityTokenPatch,
  hydrateTokens,
} from "./entity-link";
import type { TemplateSchema } from "@aetheris/shared";
import type { TokenState, VttEntity } from "./types";

const fiche = (data: Record<string, unknown>, title = "Fiche"): VttEntity => ({
  id: "e1",
  title,
  type: "personnage",
  data,
});

const token = (patch: Partial<TokenState> = {}): TokenState => ({
  id: "t1",
  x: 0,
  y: 0,
  size: 48,
  rot: 0,
  name: "Jeton",
  color: "#c03a1b",
  hp: null,
  hpMax: null,
  ac: null,
  ownerId: null,
  noteId: null,
  imageUrl: null,
  sight: { enabled: true, rangeCells: null, type: "normal" },
  light: { enabled: false, radiusCells: null },
  ...patch,
});

describe("entityCombat", () => {
  it("lit les ids conventionnels pv / ca", () => {
    expect(entityCombat(fiche({ pv: 12, ca: 15 }))).toEqual({ hp: 12, hpMax: null, ac: 15 });
  });

  it("tolère les variantes et les chaînes numériques", () => {
    expect(entityCombat(fiche({ hp: "7", hpMax: "20", ac: "13" }))).toEqual({
      hp: 7,
      hpMax: 20,
      ac: 13,
    });
    expect(entityCombat(fiche({ pv_max: 30 })).hpMax).toBe(30);
  });

  it("champ absent ou non numérique : null", () => {
    expect(entityCombat(fiche({ pv: "beaucoup", ca: null }))).toEqual({
      hp: null,
      hpMax: null,
      ac: null,
    });
  });
});

describe("entityTokenPatch", () => {
  it("nom depuis la fiche, sinon titre", () => {
    expect(entityName(fiche({ nom: "Aragorn" }, "Aragorn (titre)"))).toBe("Aragorn");
    expect(entityName(fiche({}, "Titre seul"))).toBe("Titre seul");
  });

  it("n'écrase pas les champs absents de la fiche", () => {
    expect(entityTokenPatch(fiche({ pv: 8 }))).toEqual({
      name: "Fiche",
      hp: 8,
    });
  });

  it("applique nom, PV, max et CA quand présents", () => {
    expect(entityTokenPatch(fiche({ nom: "Gobelin", pv: 3, pv_max: 3, ca: 11 }))).toEqual({
      name: "Gobelin",
      hp: 3,
      hpMax: 3,
      ac: 11,
    });
  });
});

describe("hydrateTokens", () => {
  // Scène brute telle que reçue par `scene:state`, avec des ids de champs
  // arbitraires : seuls les libellés du template indiquent PV/PV max/CA.
  const schema: TemplateSchema = {
    fields: [
      { id: "champ_pv", label: "Points de vie", kind: "number" },
      { id: "champ_max", label: "PV maximum", kind: "number" },
      { id: "champ_ca", label: "Classe d'armure", kind: "number" },
    ],
  };
  const entity: VttEntity = {
    ...fiche({ champ_pv: 7, champ_max: 20, champ_ca: 15 }, "Aldric"),
    schema,
  };

  it("rejoue la fiche sur une scène persistée, clés custom comprises", () => {
    const hydrated = hydrateTokens([token({ id: "t1", noteId: "e1" })], [entity]);
    expect(hydrated).toEqual([
      token({
        id: "t1",
        noteId: "e1",
        name: "Aldric",
        hp: 7,
        hpMax: 20,
        ac: 15,
      }),
    ]);
  });

  it("laisse intact un jeton sans fiche liée", () => {
    const raw = token({ hp: 2, name: "Sans fiche" });
    expect(hydrateTokens([raw], [entity])).toEqual([raw]);
  });

  it("conserve les valeurs locales plus fraîches pour un noteId inchangé", () => {
    // La copie `entities` du rendu est plus ancienne que `fiche:combat`.
    const previous = [token({ noteId: "e1", name: "Aldric", hp: 4, hpMax: 20, ac: 15 })];
    const [hydrated] = hydrateTokens([token({ noteId: "e1", hp: 3 })], [entity], previous);
    expect(hydrated.hp).toBe(4);
  });

  it("réhydrate quand le noteId change (nouvelle fiche liée)", () => {
    const previous = [token({ noteId: null, hp: 4 })];
    const [hydrated] = hydrateTokens([token({ noteId: "e1" })], [entity], previous);
    expect(hydrated.hp).toBe(7);
  });
});

describe("combatEntityData", () => {
  it("mappe vers les clés résolues de la fiche en ignorant les null", () => {
    expect(combatEntityData({ hp: 4, hpMax: null, ac: 12 }, fiche({ pv: 0, ca: 0 }))).toEqual({
      pv: 4,
      ca: 12,
    });
  });

  it("écrit dans l'id du champ custom du template", () => {
    const schema = { fields: [{ id: "pdv", label: "Points de vie", kind: "counter" }] };
    expect(combatEntityData({ hp: 4, hpMax: null, ac: null }, fiche({}), schema)).toEqual({
      pdv: 4,
    });
  });
});
