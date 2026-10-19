import { describe, expect, it } from "vitest";
import { buildFormulaScope, evaluateFormula } from "./formula";

describe("evaluateFormula", () => {
  it("arithmétique de base, priorités et associativité", () => {
    expect(evaluateFormula("2+3*4", {})).toBe(14);
    expect(evaluateFormula("(2+3)*4", {})).toBe(20);
    expect(evaluateFormula("10/4", {})).toBe(2.5);
    expect(evaluateFormula("7%3", {})).toBe(1);
    expect(evaluateFormula("2^3^2", {})).toBe(512); // ^ à droite
    expect(evaluateFormula("-5+2", {})).toBe(-3);
    expect(evaluateFormula("--5", {})).toBe(5);
    expect(evaluateFormula("1.5*2", {})).toBe(3);
  });

  it("identifiants et macros @force résolus depuis le scope", () => {
    expect(evaluateFormula("force+1", { force: 10 })).toBe(11);
    expect(evaluateFormula("@force+1", { force: 10 })).toBe(11);
    expect(evaluateFormula("@force", {})).toBe(0); // inconnu → 0
    expect(evaluateFormula("1+@pv", { pv: 4 })).toBe(5);
    expect(evaluateFormula("@", {})).toBeNull(); // @ sans identifiant
    expect(evaluateFormula("@+1", {})).toBeNull();
  });

  it("fonctions min/max/round/floor/ceil/abs/sqrt/pow", () => {
    expect(evaluateFormula("min(3,1,2)", {})).toBe(1);
    expect(evaluateFormula("max(3,1,2)", {})).toBe(3);
    expect(evaluateFormula("round(2.6)", {})).toBe(3);
    expect(evaluateFormula("floor(2.9)+ceil(2.1)", {})).toBe(5);
    expect(evaluateFormula("abs(-4)", {})).toBe(4);
    expect(evaluateFormula("sqrt(9)", {})).toBe(3);
    expect(evaluateFormula("pow(2,10)", {})).toBe(1024);
  });

  it("syntaxe invalide ou code injecté → null (jamais d'eval)", () => {
    expect(evaluateFormula("", {})).toBeNull();
    expect(evaluateFormula("2+", {})).toBeNull();
    expect(evaluateFormula("((1)", {})).toBeNull();
    expect(evaluateFormula("1 2", {})).toBeNull();
    expect(evaluateFormula("1.2.3", {})).toBeNull();
    expect(evaluateFormula("1;2", {})).toBeNull();
    expect(evaluateFormula("alert(1)", {})).toBeNull(); // fonction inconnue
    expect(evaluateFormula("min()", {})).toBeNull(); // 0 argument
    expect(evaluateFormula("foo(", {})).toBeNull();
  });

  it("division/modulo par zéro → null (NaN jamais exposé)", () => {
    expect(evaluateFormula("1/0", {})).toBeNull();
    expect(evaluateFormula("1%0", {})).toBeNull();
  });
});

describe("buildFormulaScope", () => {
  const schema = {
    fields: [
      { id: "force", kind: "number" },
      { id: "pv", kind: "counter" },
      { id: "mod", kind: "formula", expr: "floor(force/2)" },
      { id: "total", kind: "formula", expr: "mod+pv" },
      { id: "note", kind: "text" },
    ],
  };

  it("résout number/counter + formules récursives", () => {
    const scope = buildFormulaScope(schema, { force: 15, pv: 20 });
    expect(scope).toEqual({
      force: 15,
      pv: 20,
      note: 0,
      mod: 7,
      total: 27,
    });
  });

  it("valeur non numérique → 0", () => {
    const scope = buildFormulaScope(schema, { force: "zzz" });
    expect(scope.force).toBe(0);
    expect(scope.mod).toBe(0);
  });

  it("référence à un champ inconnu → 0", () => {
    const scope = buildFormulaScope(
      { fields: [{ id: "x", kind: "formula", expr: "@introuvable+1" }] },
      {},
    );
    expect(scope.x).toBe(1);
  });

  it("cycle A ↔ B → champs omis (pas de boucle infinie)", () => {
    const scope = buildFormulaScope(
      {
        fields: [
          { id: "a", kind: "formula", expr: "b+1" },
          { id: "b", kind: "formula", expr: "a+1" },
        ],
      },
      {},
    );
    expect(scope.a).toBeUndefined();
    expect(scope.b).toBeUndefined();
  });

  it("formule invalide → champ absent du scope", () => {
    const scope = buildFormulaScope({ fields: [{ id: "bad", kind: "formula", expr: "2+" }] }, {});
    expect(scope.bad).toBeUndefined();
  });

  it("kind list : agrégats _n + somme des colonnes nombre", () => {
    const listSchema = {
      fields: [
        { id: "force", kind: "number" },
        {
          id: "inventaire",
          kind: "list",
          columns: [
            { id: "nom", type: "text" },
            { id: "poids", type: "number" },
          ],
        },
        { id: "charge", kind: "formula", expr: "inventaire_poids + force" },
      ],
    };
    const scope = buildFormulaScope(listSchema, {
      force: 10,
      inventaire: [
        { nom: "Épée", poids: 2.5 },
        { nom: "Arc", poids: 7 },
        { nom: "Potion", poids: 3 },
      ],
    });
    expect(scope.inventaire_n).toBe(3);
    expect(scope.inventaire_poids).toBe(12.5);
    expect(scope.charge).toBe(22.5); // interconnexion no-code
    expect(evaluateFormula("inventaire_poids + force", scope)).toBe(22.5);
  });

  it("kind list sans données → _n: 0 et somme 0", () => {
    const scope = buildFormulaScope(
      {
        fields: [{ id: "inv", kind: "list", columns: [{ id: "poids", type: "number" }] }],
      },
      {},
    );
    expect(scope.inv_n).toBe(0);
    expect(scope.inv_poids).toBe(0);
  });
});
