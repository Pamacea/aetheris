/**
 * Formules de sort contextuelles (evaluateur pur, client / serveur).
 *
 * Le formulaire d'un sort peut referencer trois fiches :
 *   caster.* (lanceur), spell.* (sort), target.* (cible)
 *
 * Exemple : `1d8 + caster.INT_MOD + spell.niveau`
 * Chaque identifiant prefixe est converti en macro puis substitue par la
 * valeur issue de `buildFormulaScope`, avant évaluation.
 */

import { DiceError, parseRollExpression, substituteMacros } from "./dice.js";
import { buildFormulaScope, evaluateFormula } from "./formula.js";

export interface FormulaFieldLike {
  id: string;
  label?: string;
  kind: string;
  expr?: string;
  roll?: string;
  columns?: { id: string; type: string }[];
}

export interface FormulaSchemaLike {
  fields: FormulaFieldLike[];
}

export interface FormulaSource {
  schema: FormulaSchemaLike | null;
  data: Record<string, unknown> | null;
}

export interface SpellContext {
  caster?: FormulaSource | null;
  spell?: FormulaSource | null;
  target?: FormulaSource | null;
}

export interface SpellFormulaResult {
  expression: string;
  value: number | null;
  scope: Record<string, number>;
}

export type SpellFormulaOutcome = SpellFormulaResult | { error: string };

const PREFIX_RE = /(?<![\w.@])((?:caster|spell|target)\.[a-z0-9_.-]+)/gi;
const DICE_RE = /\d*d\d+/i;

const ROLLABLE_KINDS = new Set(["number", "counter", "formula"]);
const CAST_FORMULA_IDS = ["degats", "damage", "soin", "heal", "jet", "attaque", "attack", "roll"];
const COST_IDS = new Set(["cout", "cost", "mana", "charges", "emplacements"]);

/** Scope aplati `caster.<champ>`, `spell.<champ>`, `target.<champ>` (minuscules). */
export function buildSpellScope(ctx: SpellContext): Record<string, number> {
  const scope: Record<string, number> = {};
  const sources: [string, FormulaSource | null | undefined][] = [
    ["caster", ctx.caster],
    ["spell", ctx.spell],
    ["target", ctx.target],
  ];
  for (const [prefix, source] of sources) {
    if (!source?.schema || !source.data || !Array.isArray(source.schema.fields)) continue;
    for (const [id, value] of Object.entries(buildFormulaScope(source.schema, source.data))) {
      scope[`${prefix}.${id.toLowerCase()}`] = value;
    }
  }
  return scope;
}

/** Évalue une formule contextuelle ; jet de dés → `value: null`. */
export function evaluateSpellFormula(formula: string, ctx: SpellContext): SpellFormulaOutcome {
  const raw = formula.trim();
  if (!raw) return { error: "Formule vide." };

  const scope = buildSpellScope(ctx);
  try {
    const substituted = substituteMacros(raw.replace(PREFIX_RE, "@$1"), scope);
    if (DICE_RE.test(substituted)) {
      parseRollExpression(substituted);
      return { expression: substituted, value: null, scope };
    }
    const value = evaluateFormula(substituted, {});
    if (value === null) return { error: "Formule invalide." };
    return { expression: String(value), value, scope };
  } catch (err) {
    if (err instanceof DiceError) return { error: err.message };
    throw err;
  }
}

/** Champ `roll` à utiliser comme formule du sort (ids conventionnels d'abord). */
export function spellCastFormula(
  schema: FormulaSchemaLike | null,
  data: Record<string, unknown> | null,
): { fieldId: string; formula: string } | null {
  if (!schema || !data) return null;
  const rollable = schema.fields.filter(
    (f) => ROLLABLE_KINDS.has(f.kind) && typeof f.roll === "string" && f.roll.trim() !== "",
  );
  for (const wanted of CAST_FORMULA_IDS) {
    const field = rollable.find((f) => f.id.toLowerCase() === wanted);
    if (field?.roll) return { fieldId: field.id, formula: field.roll.trim() };
  }
  const first = rollable[0];
  return first?.roll ? { fieldId: first.id, formula: first.roll.trim() } : null;
}

/** Coût du sort (mana / charges / emplacements) ; absence → 0. */
export function spellCost(
  schema: FormulaSchemaLike | null,
  data: Record<string, unknown> | null,
): number {
  if (!schema || !data) return 0;
  for (const f of schema.fields) {
    if ((f.kind !== "number" && f.kind !== "counter") || !COST_IDS.has(f.id.toLowerCase())) {
      continue;
    }
    const n = Number(data[f.id]);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}
