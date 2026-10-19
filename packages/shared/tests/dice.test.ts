import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DiceError,
  executeRoll,
  makeRng,
  parseRollExpression,
  randomSeed,
  roll,
  substituteMacros,
} from "../src/dice.ts";

// ── Parsing — expressions simples ────────────────────────────────────

test("parse 2d6+3 : terme de dés + constante", () => {
  const p = parseRollExpression("2d6+3");
  assert.deepEqual(p.terms, [{ count: 2, sides: 6 }]);
  assert.equal(p.constants, 3);
  assert.equal(p.label, "2d6+3");
});

test("parse d20 sans compte explicite → 1 dé", () => {
  const p = parseRollExpression("d20");
  assert.deepEqual(p.terms, [{ count: 1, sides: 20 }]);
  assert.equal(p.constants, 0);
});

test("parse plusieurs termes et constante négative (2d8+1d6-1)", () => {
  const p = parseRollExpression("2d8+1d6-1");
  assert.equal(p.terms.length, 2);
  assert.deepEqual(p.terms[0], { count: 2, sides: 8 });
  assert.deepEqual(p.terms[1], { count: 1, sides: 6 });
  assert.equal(p.constants, -1);
});

test("parse conserve le libellé brut (espaces de bord)", () => {
  const p = parseRollExpression("  d20  ");
  assert.equal(p.label, "d20");
});

// ── Avantage / désavantage ───────────────────────────────────────────

test("suffixe adv / avantage / edge → mode adv sur un seul dé", () => {
  for (const suffix of ["adv", "avantage", "edge"]) {
    const p = parseRollExpression(`1d20 ${suffix}`);
    assert.equal(p.terms.length, 1);
    assert.equal(p.terms[0]?.mode, "adv");
    assert.equal(p.terms[0]?.count, 1);
  }
});

test("suffixes dis / désavantage / disadv → mode dis", () => {
  for (const suffix of ["dis", "désavantage", "desavantage", "disadv"]) {
    const p = parseRollExpression(`1d20 ${suffix}`);
    assert.equal(p.terms[0]?.mode, "dis");
  }
});

test("avantage refusé sur plusieurs dés", () => {
  assert.throws(() => parseRollExpression("2d6 adv"), DiceError);
  assert.throws(() => parseRollExpression("2d6 adv"), /un seul dé/i);
});

test("adv = max de 2 tirages, dis = min (exécution)", () => {
  const adv = roll("1d20 adv", 5);
  const dis = roll("1d20 dis", 5);
  assert.equal(adv.total, 16);
  assert.equal(dis.total, 14);
  assert.ok(adv.total >= 1 && adv.total <= 20);
  assert.ok(dis.total >= 1 && dis.total <= 20);
});

// ── Dés complexes (keep highest / lowest) ────────────────────────────

test("parse 4d6kh3 / 4d6kl3", () => {
  assert.deepEqual(parseRollExpression("4d6kh3").terms, [{ count: 4, sides: 6, keepHighest: 3 }]);
  assert.deepEqual(parseRollExpression("4d6kl3").terms, [{ count: 4, sides: 6, keepLowest: 3 }]);
});

test("kh ne garde que les N plus hauts (somme bornée)", () => {
  const out = roll("4d6kh3", 7);
  assert.equal(out.results.length, 1);
  // 3d6 gardés parmi 4 : somme ∈ [3, 18] et ≤ 4d6 entières (≤24)
  assert.ok(out.results[0]! >= 3 && out.results[0]! <= 18);
  assert.equal(out.total, out.results[0]);
});

test("kh verrouillé par la seed (valeur exacte, replay identique)", () => {
  assert.equal(roll("4d6kh3", 7).total, 12);
});

// ── Seed / déterminisme ──────────────────────────────────────────────

test("même seed → même jet (anti-cheat : tous les clients identiques)", () => {
  assert.deepEqual(roll("2d6+3", 42), roll("2d6+3", 42));
  assert.deepEqual(roll("1d20 adv", 999), roll("1d20 adv", 999));
});

test("valeurs exactes figées pour une seed donnée (régression)", () => {
  assert.deepEqual(roll("2d6+3", 42), {
    results: [7],
    total: 10,
    label: "2d6+3",
  });
  assert.deepEqual(roll("2d8+1d6-1", 99), {
    results: [10, 4],
    total: 13,
    label: "2d8+1d6-1",
  });
});

test("makeRng est déterministe et borné dans [0, 1)", () => {
  const a = makeRng(0);
  const b = makeRng(0);
  const a1 = a();
  const a2 = a();
  assert.equal(a1, 0.26642920868471265);
  assert.equal(a1, b());
  assert.equal(a2, b());
  const r = makeRng(123);
  for (let i = 0; i < 100; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1);
  }
});

test("randomSeed renvoie un uint32", () => {
  const s = randomSeed();
  assert.ok(Number.isInteger(s) && s >= 0 && s <= 0xffffffff);
});

test("exécution : chaque dé tombe dans [1, faces]", () => {
  const out = roll("3d6", 2026);
  assert.equal(out.results.length, 1);
  assert.ok(out.results[0]! >= 3 && out.results[0]! <= 18);
  assert.equal(out.total, out.results[0]!);
});

test("executeRoll sépare résultats et constantes", () => {
  const out = executeRoll(parseRollExpression("2d6+3"), 42);
  assert.equal(out.total, out.results.reduce((s, v) => s + v, 0) + 3);
});

// ── Expressions invalides → erreur propre (DiceError FR) ─────────────

test("expression vide / blanche → DiceError", () => {
  assert.throws(() => parseRollExpression(""), DiceError);
  assert.throws(() => parseRollExpression("   "), /Expression vide/);
});

test("caractères non reconnus → Expression invalide", () => {
  assert.throws(() => parseRollExpression("abc"), /Expression invalide/);
  assert.throws(() => parseRollExpression("2d6++3"), /Expression invalide/);
  assert.throws(() => parseRollExpression("2d6x"), /Expression invalide/);
});

test("aucun dé ni constante (« adv » seul) → Aucun dé", () => {
  assert.throws(() => parseRollExpression("adv"), /Aucun dé/);
});

// ── Cas limites ──────────────────────────────────────────────────────

test("0 dés refusé", () => {
  assert.throws(() => parseRollExpression("0d6"), /Nombre de dés/);
});

test("nombre de dés hors limite (101)", () => {
  assert.throws(() => parseRollExpression("101d6"), /hors limite/);
});

test("100 dés accepté (borne haute)", () => {
  const p = parseRollExpression("100d6");
  assert.equal(p.terms[0]?.count, 100);
});

test("faces hors limite : 1 face et 1001 faces refusées", () => {
  assert.throws(() => parseRollExpression("1d1"), /Faces du dé/);
  assert.throws(() => parseRollExpression("1d1001"), /Faces du dé/);
});

test("dé négatif refusé", () => {
  assert.throws(() => parseRollExpression("-2d6"), /négatif/);
});

test("constante seule acceptée (pas de dé, mais une valeur)", () => {
  const out = roll("+3", 1);
  assert.deepEqual(out, { results: [], total: 3, label: "+3" });
});

test("grand jet : 100d1000 reste dans les bornes", () => {
  const out = roll("100d1000", 7);
  assert.equal(out.results.length, 1);
  assert.ok(out.results[0]! >= 100 && out.results[0]! <= 100_000);
});

// ── Macros ───────────────────────────────────────────────────────────

test("substituteMacros remplace @force (insensible à la casse)", () => {
  assert.equal(substituteMacros("1d20 + @Force", { force: 3 }), "1d20 + 3");
  assert.equal(substituteMacros("@force+@dex", { force: 3, dex: 5 }), "3+5");
});

test("macro inconnue → DiceError", () => {
  assert.throws(() => substituteMacros("1d20+@mana", {}), DiceError);
  assert.throws(() => substituteMacros("1d20+@mana", {}), /Macro inconnue/);
});

test("macro substituée puis jet exécutable", () => {
  const expr = substituteMacros("1d20 + @force", { force: 3 });
  const p = parseRollExpression(expr);
  assert.equal(p.constants, 3);
  assert.deepEqual(p.terms, [{ count: 1, sides: 20 }]);
});

// ── Macros négatives : normalisation des signes ──────────────────────

test("macro négative après + : 1d20 + -2 → 1d20 - 2", () => {
  assert.equal(substituteMacros("1d20 + @mod", { mod: -2 }), "1d20 - 2");
});

test("macro négative après - : 1d20 - -2 → 1d20 + 2", () => {
  assert.equal(substituteMacros("1d20 - @mod", { mod: -2 }), "1d20 + 2");
});

test("macro positive : expression inchangée", () => {
  assert.equal(substituteMacros("2d6 + @bonus", { bonus: 3 }), "2d6 + 3");
});

test("macro négative : expression substituée reste parseable (racine + -2)", () => {
  const expr = substituteMacros("1d20 + @mod", { mod: -2 });
  const p = parseRollExpression(expr);
  assert.equal(p.constants, -2);
  assert.deepEqual(p.terms, [{ count: 1, sides: 20 }]);
});
