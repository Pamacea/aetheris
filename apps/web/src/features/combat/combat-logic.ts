import type { CombatState, Combatant } from "@aetheris/shared";

/**
 * Logique pure du tracker de combat — testée isolément
 * (`combat-logic.test.ts`). Aucun accès réseau ni React ici.
 */

/** Tri d'initiative décroissant ; stable : à égalité, l'ordre saisi est gardé. */
export function sortInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => b.initiative - a.initiative);
}

/** Jette l'initiative (1d20 fourni par l'appelant), trie, démarre au round 1. */
export function rollInitiativeState(state: CombatState, roll: () => number): CombatState {
  const combatants = sortInitiative(state.combatants.map((c) => ({ ...c, initiative: roll() })));
  return { combatants, activeIndex: 0, round: 1, active: true };
}

/** Tour suivant ; en fin de liste : wrap sur le premier + round suivant. */
export function nextTurnState(state: CombatState): CombatState {
  const len = state.combatants.length;
  if (len === 0) return state;
  const next = state.activeIndex + 1;
  return next >= len
    ? { ...state, activeIndex: 0, round: state.round + 1 }
    : { ...state, activeIndex: next };
}

/** Tour précédent ; en début de liste : wrap sur le dernier, round −1 (min 1). */
export function prevTurnState(state: CombatState): CombatState {
  const len = state.combatants.length;
  if (len === 0) return state;
  const prev = state.activeIndex - 1;
  return prev < 0
    ? { ...state, activeIndex: len - 1, round: Math.max(1, state.round - 1) }
    : { ...state, activeIndex: prev };
}

/**
 * Retire un combatant en conservant le MÊME combattant actif (l'index se
 * décale quand on retire avant lui) puis le re-clamp dans les bornes.
 */
export function removeCombatantState(state: CombatState, id: string): CombatState {
  const removed = state.combatants.findIndex((c) => c.id === id);
  if (removed === -1) return state;
  const combatants = state.combatants.filter((c) => c.id !== id);
  const shifted = removed < state.activeIndex ? state.activeIndex - 1 : state.activeIndex;
  return {
    ...state,
    combatants,
    activeIndex: Math.min(shifted, Math.max(0, combatants.length - 1)),
  };
}

/** ±PV d'un combattant, plancher à 0 (PV null = pas de suivi). */
export function changeHpState(state: CombatState, id: string, delta: number): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.id === id && c.hp !== null ? { ...c, hp: Math.max(0, c.hp + delta) } : c,
    ),
  };
}

/** Remet le tracker au repos en gardant les combattants (initiative à 0). */
export function resetCombatState(state: CombatState): CombatState {
  return {
    combatants: state.combatants.map((c) => ({ ...c, initiative: 0 })),
    activeIndex: 0,
    round: 1,
    active: false,
  };
}
