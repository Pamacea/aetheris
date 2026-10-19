"use client";

import type { CombatState } from "@aetheris/shared";

/** Barre de combat : round, état du combat, commandes MJ. */
export function CombatBar({
  state,
  isGM,
  rollInitiative,
  prevTurn,
  nextTurn,
  resetCombat,
}: {
  state: CombatState;
  isGM: boolean;
  rollInitiative: () => void;
  prevTurn: () => void;
  nextTurn: () => void;
  resetCombat: () => void;
}) {
  const active = state.combatants[state.activeIndex];

  return (
    <div className="panel flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="border border-border px-2 py-0.5 text-xs tracking-widest uppercase">
          Round {state.round}
        </span>
        <span className={state.active ? "text-accent" : "text-muted"}>
          {state.active && active
            ? `Tour de ${active.name}`
            : state.active
              ? "Combat actif"
              : "Hors combat"}
        </span>
      </div>
      {isGM && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={rollInitiative}
            disabled={state.combatants.length === 0}
          >
            Jeter l&apos;initiative
          </button>
          <button type="button" className="btn" onClick={prevTurn} disabled={!state.active}>
            ← Tour
          </button>
          <button type="button" className="btn" onClick={nextTurn} disabled={!state.active}>
            Tour suivant →
          </button>
          <button type="button" className="btn" onClick={resetCombat}>
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
