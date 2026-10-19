"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { runSandbox } from "@/lib/sandbox";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import { parseCommand } from "./command";
import {
  DEFAULT_SOURCE,
  emitMacrosChanged,
  macrosKey,
  parseMacros,
  readMacrosRaw,
  removeMacro,
  subscribeMacros,
  upsertMacro,
  type Macro,
} from "./macro-storage";

/**
 * Éditeur de macros par campagne : corps JS exécuté en sandbox (iframe
 * sans origine partagée, `@/lib/sandbox`), résultat = commande envoyée
 * au chat via la socket campagne (`dice:roll` / `chat:send` — le broadcast
 * alimente le panneau Chat monté à côté). Stockage :
 * `localStorage["aetheris:macros:<campaignId>"]` —
 * shortcut: macros côté client uniquement, pas de migration Prisma —
 * upgrader vers une table dédiée si besoin de partage multi-appareils.
 * Lecture via useSyncExternalStore (pattern `tri-panel.tsx`) : pas d'effet
 * de chargement, pas de mismatch d'hydratation.
 */
export function useMacroEditor(campaignId: string) {
  const storageKey = macrosKey(campaignId);
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

  function persist(next: Macro[]): boolean {
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
    setError(null);
    if (persist(upsertMacro(macros, { id, name: trimmed, source }))) {
      setCurrentId(id);
      setName(trimmed);
    }
  }

  function remove() {
    if (!currentId) return;
    const macro = macros.find((m) => m.id === currentId);
    if (!window.confirm(`Supprimer la macro « ${macro?.name ?? ""} » ?`)) return;
    persist(removeMacro(macros, currentId));
    newMacro();
  }

  /** Exécute la macro en sandbox et renvoie la commande produite (ou null). */
  async function run(): Promise<string | null> {
    setError(null);
    setOutput(null);
    if (!source.trim()) {
      setError("Macro vide.");
      return null;
    }
    try {
      const result = await runSandbox(source, { title: "Exécution de macro (sandbox)" });
      setOutput(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  function test() {
    startTransition(async () => {
      await run();
    });
  }

  function execute() {
    startTransition(async () => {
      const cmd = await run();
      if (cmd === null) return;
      const parsed = parseCommand(cmd);
      if (parsed.kind === "error") {
        setOutput(null);
        setError(parsed.message);
        return;
      }
      setError(null);
      if (parsed.kind === "roll") {
        socket.emit("dice:roll", { campaignId, expression: parsed.expression });
        setOutput(`Jet envoyé : ${cmd.trim()}`);
      } else if (parsed.kind === "calc") {
        setOutput(`Calcul : ${parsed.expression} = ${parsed.value}`);
      } else {
        socket.emit("chat:send", { campaignId, content: parsed.content });
        setOutput(`Message envoyé : ${parsed.content}`);
      }
    });
  }

  return {
    connected,
    macros,
    currentId,
    name,
    source,
    output,
    error,
    pending,
    newMacro,
    select,
    save,
    remove,
    test,
    execute,
    setName,
    setSource,
  };
}
