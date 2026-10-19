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

const EMPTY: CombatState = {
  combatants: [],
  activeIndex: 0,
  round: 1,
  active: false,
};

/**
 * État du combat + mutations : le MJ commit (server action) puis relaie via
 * le relais générique `plugin:event` — les autres clients suivent en temps réel.
 */
export function useCombat(campaignId: string, initialState: CombatState) {
  const { socket } = useCampaignSocket(campaignId);
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

  function removeCombatant(id: string) {
    const combatants = state.combatants.filter((c) => c.id !== id);
    void commit({
      ...state,
      combatants,
      activeIndex: Math.min(state.activeIndex, Math.max(0, combatants.length - 1)),
    });
  }

  function changeHp(id: string, delta: number) {
    void commit({
      ...state,
      combatants: state.combatants.map((c) =>
        c.id === id && c.hp !== null ? { ...c, hp: Math.max(0, c.hp + delta) } : c,
      ),
    });
  }

  /** 1d20 par combattant, tri décroissant, combat lancé. */
  function rollInitiative() {
    const rolled = state.combatants.map((c) => ({
      ...c,
      initiative: executeRoll(parseRollExpression("1d20"), randomSeed()).total,
    }));
    rolled.sort((a, b) => b.initiative - a.initiative);
    void commit({ ...state, combatants: rolled, activeIndex: 0, round: 1, active: true });
  }

  function nextTurn() {
    const len = state.combatants.length;
    if (len === 0) return;
    const next = state.activeIndex + 1;
    void commit(
      next >= len
        ? { ...state, activeIndex: 0, round: state.round + 1 }
        : { ...state, activeIndex: next },
    );
  }

  function prevTurn() {
    const len = state.combatants.length;
    if (len === 0) return;
    const prev = state.activeIndex - 1;
    void commit(
      prev < 0
        ? { ...state, activeIndex: len - 1, round: Math.max(1, state.round - 1) }
        : { ...state, activeIndex: prev },
    );
  }

  function resetCombat() {
    void commit({
      ...EMPTY,
      combatants: state.combatants.map((c) => ({ ...c, initiative: 0 })),
    });
  }

  return {
    state,
    error,
    commit,
    removeCombatant,
    changeHp,
    rollInitiative,
    nextTurn,
    prevTurn,
    resetCombat,
  };
}
