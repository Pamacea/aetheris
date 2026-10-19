"use client";

import { useEffect, useState } from "react";
import {
  combatStateSchema,
  executeRoll,
  parseRollExpression,
  randomSeed,
  COMBAT_STATE_EVENT,
  type CombatState,
  type PluginEvent,
} from "@aetheris/shared";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import { saveCombatState } from "./actions";
import {
  changeHpState,
  nextTurnState,
  prevTurnState,
  removeCombatantState,
  resetCombatState,
  rollInitiativeState,
} from "./combat-logic";

/**
 * État du combat + mutations : le MJ commit (server action) puis relaie via
 * le relais générique `plugin:event` — les autres clients suivent en temps réel.
 */
export function useCombat(campaignId: string, initialState: CombatState) {
  const { socket, connected } = useCampaignSocket(campaignId);
  const [state, setState] = useState<CombatState>(initialState);
  const [error, setError] = useState<string | null>(null);

  // Sync entrante : état commité par un autre client.
  useEffect(() => {
    const onPlugin = (ev: PluginEvent) => {
      if (ev.pluginId !== "combat" || ev.type !== COMBAT_STATE_EVENT) return;
      const parsed = combatStateSchema.safeParse(ev.payload);
      if (parsed.success) setState(parsed.data);
    };
    socket.on("plugin:event", onPlugin);
    return () => {
      socket.off("plugin:event", onPlugin);
    };
  }, [socket]);

  /** Persiste puis broadcast. Rollback local si la persistance échoue. */
  async function commit(next: CombatState): Promise<void> {
    const prev = state;
    setState(next);
    setError(null);
    const res = await saveCombatState(campaignId, next);
    if (!res.ok) {
      setError(res.error);
      setState(prev);
      return;
    }
    socket.emit("plugin:event", {
      campaignId,
      pluginId: "combat",
      type: COMBAT_STATE_EVENT,
      payload: next,
    });
  }

  /** 1d20 par combattant, tri décroissant, combat lancé. */
  function rollInitiative(): void {
    const parsed = parseRollExpression("1d20");
    void commit(rollInitiativeState(state, () => executeRoll(parsed, randomSeed()).total));
  }

  return {
    state,
    error,
    connected,
    commit,
    removeCombatant: (id: string) => void commit(removeCombatantState(state, id)),
    changeHp: (id: string, delta: number) => void commit(changeHpState(state, id, delta)),
    rollInitiative,
    nextTurn: () => void commit(nextTurnState(state)),
    prevTurn: () => void commit(prevTurnState(state)),
    resetCombat: () => void commit(resetCombatState(state)),
  };
}
