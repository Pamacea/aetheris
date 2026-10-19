"use client";

import { useState } from "react";
import { type CombatState, type Combatant } from "@aetheris/shared";
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      {/* ── Barre de combat ── */}
      <CombatBar
        state={state}
        isGM={isGM}
        rollInitiative={rollInitiative}
        prevTurn={prevTurn}
        nextTurn={nextTurn}
        resetCombat={resetCombat}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* ── Ajout (MJ) ── */}
      {isGM && (
        <form onSubmit={addCombatant} className="panel flex flex-wrap items-end gap-3 p-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Nom
            <input
              className="input w-48"
              name="combattant-nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Gobelin, Astarion…"
              maxLength={80}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            PV max
            <input
              className="input w-24"
              name="combattant-pv-max"
              value={hpMax}
              onChange={(e) => setHpMax(e.target.value)}
              placeholder="—"
              inputMode="numeric"
            />
          </label>
          <button type="submit" className="btn" disabled={name.trim() === ""}>
            Ajouter
          </button>
        </form>
      )}

      {/* ── Liste d'initiative ── */}
      <CombatList state={state} isGM={isGM} changeHp={changeHp} removeCombatant={removeCombatant} />
    </div>
  );
}
