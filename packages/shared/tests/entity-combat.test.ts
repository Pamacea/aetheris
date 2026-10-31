import { test } from "node:test";
import assert from "node:assert/strict";
// Import depuis dist/ : `node --test` ne réécrit pas les spécificateurs
// `.js` → `.ts` ; le script `test` rebuild avant de lancer les tests.
import {
  combatEntityData,
  entityCombatValues,
  entityName,
  entityTokenPatch,
  resolveCombatKeys,
  type EntityLike,
  type SchemaLike,
} from "../dist/entity-combat.js";

const entity = (data: Record<string, unknown>, title = "Fiche"): EntityLike => ({ title, data });

test("clés exactes historiques pv / pv_max / ca / nom", () => {
  const fiche = entity({ pv: 12, pv_max: 30, ca: 15, nom: "Aragorn" });
  assert.deepEqual(resolveCombatKeys(fiche), {
    hp: "pv",
    hpMax: "pv_max",
    ac: "ca",
  });
  assert.deepEqual(entityCombatValues(fiche), { hp: 12, hpMax: 30, ac: 15 });
  assert.equal(entityName(fiche), "Aragorn");
  assert.deepEqual(entityTokenPatch(fiche), {
    name: "Aragorn",
    hp: 12,
    hpMax: 30,
    ac: 15,
  });
});

test("libellés français accentués et espacés", () => {
  const fiche = entity({ "Points de vie": "9", "PV Maximum": 20, "Classe d'armure": 16 });
  assert.deepEqual(resolveCombatKeys(fiche), {
    hp: "Points de vie",
    hpMax: "PV Maximum",
    ac: "Classe d'armure",
  });
  assert.deepEqual(entityCombatValues(fiche), { hp: 9, hpMax: 20, ac: 16 });
});

test("anglais hp / hp_max / ac", () => {
  const fiche = entity({ hp: 7, hp_max: 20, ac: 13 });
  assert.deepEqual(resolveCombatKeys(fiche), { hp: "hp", hpMax: "hp_max", ac: "ac" });
  assert.deepEqual(entityCombatValues(fiche), { hp: 7, hpMax: 20, ac: 13 });
});

test("« PV Max » ne sert jamais de PV courants", () => {
  assert.equal(resolveCombatKeys(entity({ "PV Max": 30 })).hp, null);
  assert.deepEqual(resolveCombatKeys(entity({ pv: 12, "PV Max": 30 })), {
    hp: "pv",
    hpMax: "PV Max",
    ac: null,
  });
});

test("champ custom résolu par le libellé du schéma, écrit dans son id", () => {
  const schema: SchemaLike = {
    fields: [
      { id: "pdv", label: "Points de vie", kind: "counter" },
      { id: "pdv_max", label: "PV Maximum", kind: "number" },
      { id: "arm", label: "Classe d'armure", kind: "number" },
    ],
  };
  const fiche = entity({});
  assert.deepEqual(resolveCombatKeys(fiche, schema), {
    hp: "pdv",
    hpMax: "pdv_max",
    ac: "arm",
  });
  assert.deepEqual(combatEntityData({ hp: 9, hpMax: 20, ac: 16 }, fiche, schema), {
    pdv: 9,
    pdv_max: 20,
    arm: 16,
  });
});

test("nom résolu par le libellé d'un champ texte du schéma", () => {
  const schema: SchemaLike = {
    fields: [{ id: "appellation", label: "Nom du personnage", kind: "text" }],
  };
  assert.equal(entityName(entity({ appellation: "Aragorn" }), schema), "Aragorn");
});

test("fiche sans aucun champ de combat : combatEntityData renvoie {}", () => {
  assert.deepEqual(combatEntityData({ hp: 5, hpMax: 10, ac: 12 }, entity({ notes: "rien" })), {});
});

test("valeurs non numériques ignorées", () => {
  const fiche = entity({ pv: "beaucoup", ca: null, hp: "" });
  assert.deepEqual(entityCombatValues(fiche), { hp: null, hpMax: null, ac: null });
});

test("un champ formule est lu s'il est déjà calculé mais jamais écrit", () => {
  const schema: SchemaLike = {
    fields: [
      { id: "pv", label: "PV", kind: "formula" },
      { id: "ca", label: "CA", kind: "number" },
    ],
  };
  const fiche = entity({ pv: 10, ca: 12 });
  assert.equal(entityCombatValues(fiche, schema).hp, 10);
  assert.deepEqual(combatEntityData({ hp: 20, hpMax: null, ac: 15 }, fiche, schema), { ca: 15 });
});

test("« Attaque » n'est pas prise pour l'armure", () => {
  assert.equal(resolveCombatKeys(entity({ attaque: 5 })).ac, null);
  assert.equal(resolveCombatKeys(entity({ attaque: 5, defense: 14 })).ac, "defense");
});

test("null omis du patch, valeur absente non écrasée", () => {
  assert.deepEqual(entityTokenPatch(entity({ pv: 8 })), { name: "Fiche", hp: 8 });
  assert.deepEqual(combatEntityData({ hp: 4, hpMax: null, ac: 12 }, entity({ pv: 0, ca: 0 })), {
    pv: 4,
    ca: 12,
  });
});
