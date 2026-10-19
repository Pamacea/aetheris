"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import {
  DEFAULT_SOURCE,
  emitMacrosChanged,
  parseMacros,
  readMacrosRaw,
  subscribeMacros,
  type Macro,
} from "./macro-editor-storage";

export function useMacroEditor(campaignId: string) {
  const storageKey = `aetheris:macros:${campaignId}`;
  const { socket, connected } = useCampaignSocket(campaignId);

  const rawMacros = useSyncExternalStore(
    subscribeMacros,
    () => readMacrosRaw(storageKey),
    () => "[]",
  );
  const macros = useMemo(() => parseMacros(rawMacros), [rawMacros]);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Remontée des erreurs WS (expression invalide, accès refusé…).
  useEffect(() => {
    const onException = (err: { message?: string }) => {
      setError(err.message ?? "Erreur serveur.");
    };
    socket.on("exception", onException);
    return () => {
      socket.off("exception", onException);
    };
  }, [socket]);

  function persist(next: Macro[]) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      emitMacrosChanged();
      return true;
    } catch {
      setError("Stockage local indisponible (plein ou bloqué).");
      return false;
    }
  }

  function newMacro() {
    setError(null);
    setOutput(null);
    setCurrentId(null);
    setName("");
    setSource(DEFAULT_SOURCE);
  }

  function select(m: Macro) {
    setError(null);
    setOutput(null);
    setCurrentId(m.id);
    setName(m.name);
    setSource(m.source);
  }

  function save() {
    const trimmed = name.trim() || "Macro sans nom";
    const id = currentId ?? crypto.randomUUID();
    const macro: Macro = { id, name: trimmed, source };
    const next = macros.some((m) => m.id === id)
      ? macros.map((m) => (m.id === id ? macro : m))
      : [...macros, macro];
    setError(null);
    if (persist(next)) {
      setCurrentId(id);
      setName(trimmed);
    }
  }

  function remove() {
    if (!currentId) return;
    const macro = macros.find((m) => m.id === currentId);
    if (!window.confirm(`Supprimer la macro « ${macro?.name ?? ""} » ?`)) {
      return;
    }
    const next = macros.filter((m) => m.id !== currentId);
    persist(next);
    newMacro();
  }

  return {
    socket,
    connected,
    macros,
    currentId,
    name,
    source,
    output,
    error,
    pending,
    startTransition,
    newMacro,
    select,
    save,
    remove,
    setName,
    setSource,
    setOutput,
    setError,
  };
}
