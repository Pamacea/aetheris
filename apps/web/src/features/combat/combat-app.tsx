"use client";

import { useState } from "react";
import type { CombatState, Combatant } from "@aetheris/shared";
import { CombatBar } from "./combat-bar";
import { CombatList } from "./combat-list";
import { useCombat } from "./use-combat";

/**
 * Tracker de combat : initiative, tours, rounds.
 * Le MJ commit l'état (server action) puis le relaie via le relais
 * générique `plugin:event` — les autres clients (MJ ou joueurs)
 * suivent en temps réel.
 */
export function CombatApp({
  campaignId,
  isGM,
  initialState,
}: {
  campaignId: string;
  isGM: boolean;
  initialState: CombatState;
}) {
  const {
    state,
    error,
    connected,
    commit,
    removeCombatant,
    changeHp,
    rollInitiative,
    nextTurn,
    prevTurn,
    resetCombat,
  } = useCombat(campaignId, initialState);
  const [name, setName] = useState("");
  const [hpMax, setHpMax] = useState("");

  function addCombatant(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const max = hpMax.trim() === "" ? null : Number(hpMax);
    const combatant: Combatant = {
      id: crypto.randomUUID(),
      name: trimmed,
      initiative: 0,
      hp: max !== null && Number.isFinite(max) ? max : null,
      hpMax: max !== null && Number.isFinite(max) ? max : null,
      isPC: false,
    };
    void commit({
      ...state,
      combatants: [...state.combatants, combatant],
    });
    setName("");
    setHpMax("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <CombatBar
        state={state}
        isGM={isGM}
        connected={connected}
        rollInitiative={rollInitiative}
        prevTurn={prevTurn}
        nextTurn={nextTurn}
        resetCombat={resetCombat}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isGM && (
        <form onSubmit={addCombatant} className="panel flex flex-wrap items-end gap-3 p-3">
          <label className="flex basis-48 flex-1 flex-col gap-1 text-xs text-muted">
            Nom
            <input
              className="input"
              name="combattant-nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Gobelin, Astarion…"
              maxLength={80}
            />
          </label>
          <label className="flex basis-24 flex-col gap-1 text-xs text-muted">
            PV max
            <input
              className="input"
              name="combattant-pv-max"
              value={hpMax}
              onChange={(e) => setHpMax(e.target.value)}
              placeholder="—"
              inputMode="numeric"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-tri" disabled={name.trim() === ""}>
            Ajouter
          </button>
        </form>
      )}

      <CombatList state={state} isGM={isGM} changeHp={changeHp} removeCombatant={removeCombatant} />
    </div>
  );
}
