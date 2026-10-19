import { describe, expect, it } from "vitest";
import { EMPTY_COMBAT_STATE, type CombatState, type Combatant } from "@aetheris/shared";
import {
  changeHpState,
  nextTurnState,
  prevTurnState,
  removeCombatantState,
  resetCombatState,
  rollInitiativeState,
  sortInitiative,
} from "./combat-logic";

function combatant(id: string, initiative = 0, hp: number | null = null): Combatant {
  return { id, name: id.toUpperCase(), initiative, hp, hpMax: hp, isPC: false };
}

function state(combatants: Combatant[], over: Partial<CombatState> = {}): CombatState {
  return { ...EMPTY_COMBAT_STATE, combatants, ...over };
}

describe("sortInitiative", () => {
  it("trie par initiative décroissante sans muter l'entrée", () => {
    const input = [combatant("a", 8), combatant("b", 17), combatant("c", 3)];
    const sorted = sortInitiative(input);
    expect(sorted.map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(input.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("stable à égalité : l'ordre saisé est conservé", () => {
    const sorted = sortInitiative([combatant("a", 12), combatant("b", 12), combatant("c", 12)]);
    expect(sorted.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("rollInitiativeState", () => {
  it("applique les jets, trie et relance au round 1 sur le premier", () => {
    const jets = [7, 19, 3];
    let i = 0;
    const rolled = rollInitiativeState(
      state([combatant("a"), combatant("b"), combatant("c")]),
      () => jets[i++] as number,
    );
    expect(rolled.combatants.map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(rolled.combatants.map((c) => c.initiative)).toEqual([19, 7, 3]);
    expect(rolled.activeIndex).toBe(0);
    expect(rolled.round).toBe(1);
    expect(rolled.active).toBe(true);
  });
});

describe("nextTurnState", () => {
  it("avance d'un tour dans le round", () => {
    const next = nextTurnState(state([combatant("a"), combatant("b")], { activeIndex: 0 }));
    expect(next.activeIndex).toBe(1);
    expect(next.round).toBe(1);
  });

  it("wrap en fin de liste et incrémente le round", () => {
    const next = nextTurnState(state([combatant("a"), combatant("b")], { activeIndex: 1 }));
    expect(next.activeIndex).toBe(0);
    expect(next.round).toBe(2);
  });

  it("aucun combattant : état inchangé", () => {
    const before = state([]);
    expect(nextTurnState(before)).toBe(before);
  });
});

describe("prevTurnState", () => {
  it("recule d'un tour", () => {
    const prev = prevTurnState(state([combatant("a"), combatant("b")], { activeIndex: 1 }));
    expect(prev.activeIndex).toBe(0);
    expect(prev.round).toBe(1);
  });

  it("wrap en début de liste et décrémente le round (jamais sous 1)", () => {
    const prev = prevTurnState(state([combatant("a"), combatant("b")], { activeIndex: 0 }));
    expect(prev.activeIndex).toBe(1);
    expect(prev.round).toBe(1);
    const prev2 = prevTurnState(
      state([combatant("a"), combatant("b")], { activeIndex: 0, round: 3 }),
    );
    expect(prev2.round).toBe(2);
  });
});

describe("removeCombatantState", () => {
  it("conserve le même combattant actif quand on retire avant lui", () => {
    // actif = "c" (index 2) ; on retire "a" → "c" doit rester actif (index 1).
    const next = removeCombatantState(
      state([combatant("a"), combatant("b"), combatant("c")], { activeIndex: 2 }),
      "a",
    );
    expect(next.combatants.map((c) => c.id)).toEqual(["b", "c"]);
    expect(next.activeIndex).toBe(1);
  });

  it("clamp l'index actif quand on retire le dernier combattant", () => {
    const next = removeCombatantState(
      state([combatant("a"), combatant("b")], { activeIndex: 1 }),
      "b",
    );
    expect(next.combatants.map((c) => c.id)).toEqual(["a"]);
    expect(next.activeIndex).toBe(0);
  });

  it("id inconnu : état inchangé", () => {
    const before = state([combatant("a")]);
    expect(removeCombatantState(before, "zzz")).toBe(before);
  });
});

describe("changeHpState", () => {
  it("applique le delta avec plancher à 0 et ignore les PV null", () => {
    const next = changeHpState(state([combatant("a", 0, 5), combatant("b", 0, null)]), "a", -3);
    expect(next.combatants[0]?.hp).toBe(2);
    expect(next.combatants[1]?.hp).toBeNull();
    expect(changeHpState(state([combatant("a", 0, 1)]), "a", -5).combatants[0]?.hp).toBe(0);
  });
});

describe("resetCombatState", () => {
  it("garde les combattants, remet initiative/round/actif à zéro", () => {
    const next = resetCombatState(
      state([combatant("a", 15), combatant("b", 9)], { activeIndex: 1, round: 4, active: true }),
    );
    expect(next.combatants.map((c) => c.initiative)).toEqual([0, 0]);
    expect(next.activeIndex).toBe(0);
    expect(next.round).toBe(1);
    expect(next.active).toBe(false);
  });
});
