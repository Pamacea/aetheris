"use client";

import type { CombatState } from "@aetheris/shared";

/** Barre de combat : round, état du combat, commandes MJ. */
export function CombatBar({
  state,
  isGM,
  connected,
  rollInitiative,
  prevTurn,
  nextTurn,
  resetCombat,
}: {
  state: CombatState;
  isGM: boolean;
  connected: boolean;
  rollInitiative: () => void;
  prevTurn: () => void;
  nextTurn: () => void;
  resetCombat: () => void;
}) {
  const active = state.combatants[state.activeIndex];

  return (
    <div className="panel flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="border border-accent/60 px-2 py-0.5 text-xs tracking-widest text-accent uppercase">
          Round {state.round}
        </span>
        <span className={state.active ? "text-foreground" : "text-muted"}>
          {state.active && active
            ? `Tour de ${active.name}`
            : state.active
              ? "Combat actif"
              : "Hors combat"}
        </span>
        <span
          className={`text-[0.65rem] tracking-widest uppercase ${connected ? "text-muted" : "text-destructive"}`}
        >
          {connected ? "Temps réel actif" : "Hors ligne — reconnexion…"}
        </span>
      </div>
      {isGM && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn px-3 py-1.5 text-xs"
            onClick={rollInitiative}
            disabled={state.combatants.length === 0}
          >
            Jeter l&apos;initiative
          </button>
          <button
            type="button"
            className="btn border-transparent px-3 py-1.5 text-xs"
            onClick={prevTurn}
            disabled={!state.active}
          >
            ← Tour
          </button>
          <button
            type="button"
            className="btn border-transparent px-3 py-1.5 text-xs"
            onClick={nextTurn}
            disabled={!state.active}
          >
            Tour suivant →
          </button>
          <button
            type="button"
            className="btn border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
            onClick={resetCombat}
          >
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
