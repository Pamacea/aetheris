"use client";

import { useEffect, useRef, useState } from "react";
import { parseRollExpression, substituteMacros, type DiceRoll } from "@aetheris/shared";
import { useCampaignSocket } from "./use-campaign-socket";

// Hook de jet de dé : substitution client des macros @stat (portée de la
// fiche, inclut les résultats de formules — jamais stockés côté serveur),
// puis émission dice:roll (le serveur tire avec sa seed → broadcast).

const ERROR_CLEAR_MS = 5000;
const PENDING_TTL_MS = 5000;

/** Dernier jet affiché, rattaché au champ qui l'a lancé. */
export interface DiceRollDisplay {
  fieldId: string;
  results: number[];
  total: number;
}

export interface DiceRollError {
  fieldId: string;
  message: string;
}

export function useDiceRoll(campaignId: string): {
  roll: (expression: string, scope: Record<string, unknown>, fieldId: string) => void;
  last: DiceRollDisplay | null;
  error: DiceRollError | null;
  clear: () => void;
} {
  const { socket } = useCampaignSocket(campaignId);
  const [last, setLast] = useState<DiceRollDisplay | null>(null);
  const [error, setError] = useState<DiceRollError | null>(null);
  // Jet en attente : expression émise + champ demandeur (le broadcast
  // revient à l'identique, on le rattache ainsi au bon champ).
  const pendingRef = useRef<{ expr: string; fieldId: string } | null>(null);
  const pendingAtRef = useRef(0);

  // Effacement automatique de l'erreur (5 s), nettoyé au unmount.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), ERROR_CLEAR_MS);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    function onRolled(payload: DiceRoll) {
      const pending = pendingRef.current;
      if (!pending || payload.expression !== pending.expr) return;
      setLast({ fieldId: pending.fieldId, results: payload.results, total: payload.total });
      setError(null);
      pendingRef.current = null;
    }

    function onException(payload: { message?: string }) {
      const pending = pendingRef.current;
      // Ignoré si aucun jet en attente ou jet déjà expiré : une exception
      // asynchrone (rate-limit, jet d'un autre) n'est pas la nôtre.
      if (!pending || Date.now() - pendingAtRef.current > PENDING_TTL_MS) return;
      pendingRef.current = null;
      setError({ fieldId: pending.fieldId, message: payload.message ?? "Jet refusé" });
    }

    socket.on("dice:rolled", onRolled);
    socket.on("exception", onException);
    return () => {
      socket.off("dice:rolled", onRolled);
      socket.off("exception", onException);
    };
  }, [socket]);

  function roll(expression: string, scope: Record<string, unknown>, fieldId: string): void {
    // Macros : portée de la fiche, clés insensibles à la casse.
    const stats: Record<string, number> = {};
    for (const [key, value] of Object.entries(scope)) {
      if (typeof value === "number" && Number.isFinite(value)) stats[key.toLowerCase()] = value;
    }
    let expr: string;
    try {
      expr = substituteMacros(expression, stats);
    } catch (e) {
      setError({ fieldId, message: e instanceof Error ? e.message : String(e) });
      return;
    }
    try {
      parseRollExpression(expr);
    } catch (e) {
      setError({ fieldId, message: e instanceof Error ? e.message : String(e) });
      return;
    }
    pendingRef.current = { expr, fieldId };
    pendingAtRef.current = Date.now();
    socket.emit("dice:roll", { campaignId, expression: expr });
  }

  function clear(): void {
    setLast(null);
    setError(null);
    pendingRef.current = null;
  }

  return { roll, last, error, clear };
}
