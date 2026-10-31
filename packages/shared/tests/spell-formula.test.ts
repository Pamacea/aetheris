import { test } from "node:test";
import assert from "node:assert/strict";
import { substituteMacros } from "../dist/dice.js";
import { evaluateFormula } from "../dist/formula.js";
import {
  buildSpellScope,
  evaluateSpellFormula,
  spellCastFormula,
  spellCost,
  type SpellContext,
} from "../dist/spell-formula.js";

const caster = {
  schema: {
    fields: [
      { id: "INT_MOD", label: "Mod. INT", kind: "number" },
      { id: "FOR", kind: "number" },
      { id: "niveau", kind: "number" },
    ],
  },
  data: { INT_MOD: 3, FOR: 4, niveau: 5 },
};

const spell = {
  schema: { fields: [{ id: "niveau", kind: "number" }] },
  data: { niveau: 1 },
};

const target = {
  schema: { fields: [{ id: "CA", kind: "number" }] },
  data: { CA: 15 },
};

const ctx: SpellContext = { caster, spell, target };

// ── Scope ────────────────────────────────────────────────────────────

test("buildSpellScope préfixe et minuscule chaque source", () => {
  const scope = buildSpellScope(ctx);
  assert.equal(scope["caster.int_mod"], 3);
  assert.equal(scope["caster.for"], 4);
  assert.equal(scope["spell.niveau"], 1);
  assert.equal(scope["target.ca"], 15);
  assert.equal("INT_MOD" in scope, false);
});

test("buildSpellScope ignore une source sans schéma", () => {
  const scope = buildSpellScope({ caster, spell: { schema: null, data: { niveau: 1 } } });
  assert.equal(scope["spell.niveau"], undefined);
  assert.equal(scope["caster.int_mod"], 3);
});

// ── Évaluation ───────────────────────────────────────────────────────

test("formule avec dé : caster.INT_MOD et spell.niveau substitués", () => {
  const out = evaluateSpellFormula("1d8 + caster.INT_MOD + spell.niveau", ctx);
  assert.equal("error" in out, false);
  if ("error" in out) return;
  assert.equal(out.expression, "1d8 + 3 + 1");
  assert.equal(out.value, null);
  assert.equal(out.scope["caster.int_mod"], 3);
});

test("identifiant inconnu → erreur", () => {
  const out = evaluateSpellFormula("caster.INCONNU + 1", ctx);
  assert.deepEqual(out, { error: "Macro inconnue : @caster.INCONNU" });
});

test("formule purement arithmétique → valeur numérique", () => {
  const out = evaluateSpellFormula("caster.FOR * 2", ctx);
  assert.equal("error" in out, false);
  if ("error" in out) return;
  assert.equal(out.value, 8);
  assert.equal(out.expression, "8");
});

test("formule invalide → erreur", () => {
  assert.deepEqual(evaluateSpellFormula("1d8 +", ctx), {
    error: "Expression invalide : « 1d8 + »",
  });
  assert.deepEqual(evaluateSpellFormula("caster.FOR +", ctx), { error: "Formule invalide." });
});

test("formule vide → erreur", () => {
  assert.deepEqual(evaluateSpellFormula("   ", ctx), { error: "Formule vide." });
});

test("macro @ déjà présente non doublée", () => {
  const out = evaluateSpellFormula("@caster.INT_MOD + 1", ctx);
  assert.equal("error" in out, false);
  if ("error" in out) return;
  assert.equal(out.value, 4);
});

// ── Choix du champ / coût ────────────────────────────────────────────

test("spellCastFormula priorise degats sur un autre champ rollable", () => {
  const schema = {
    fields: [
      { id: "bonus", kind: "number", roll: "1d4" },
      { id: "degats", kind: "number", roll: "1d8 + caster.INT_MOD" },
    ],
  };
  assert.deepEqual(spellCastFormula(schema, {}), {
    fieldId: "degats",
    formula: "1d8 + caster.INT_MOD",
  });
});

test("spellCastFormula retombe sur le premier champ rollable", () => {
  const schema = { fields: [{ id: "effet", kind: "formula", roll: "2d6" }] };
  assert.deepEqual(spellCastFormula(schema, {}), { fieldId: "effet", formula: "2d6" });
});

test("spellCastFormula sans champ rollable → null", () => {
  assert.equal(spellCastFormula({ fields: [{ id: "degats", kind: "number" }] }, {}), null);
});

test("spellCost lit cout, absence → 0", () => {
  assert.equal(spellCost({ fields: [{ id: "Cout", kind: "number" }] }, { Cout: 3 }), 3);
  assert.equal(spellCost({ fields: [{ id: "autre", kind: "number" }] }, { autre: 3 }), 0);
  assert.equal(spellCost(null, null), 0);
});

// ── Tokenizer / macros étendus au point ──────────────────────────────

test("evaluateFormula accepte les identifiants pointés", () => {
  assert.equal(evaluateFormula("caster.int_mod + 2", { "caster.int_mod": 3 }), 5);
});

test("les nombres décimaux restent inchangés", () => {
  assert.equal(evaluateFormula("1.5 + 2", {}), 3.5);
});

test("substituteMacros accepte les macros pointées", () => {
  assert.equal(substituteMacros("1d8 + @caster.INT_MOD", { "caster.int_mod": 4 }), "1d8 + 4");
});
