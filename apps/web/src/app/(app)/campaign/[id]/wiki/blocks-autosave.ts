"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NoteBlock } from "@aetheris/shared";
import { saveBlockLibrary, saveNoteBlocks } from "./actions";

type PanelStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1200;

/**
 * Autosave du panneau Blocs : données en attente + timer partagé
 * (blocs et bibliothèque), flush de secours au unmount.
 */
export function useBlocksAutosave(campaignId: string, noteId: string | null) {
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = useRef<NoteBlock[] | null>(null);
  const libPending = useRef<NoteBlock[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistBlocks = useCallback(
    async (data: NoteBlock[]) => {
      if (!noteId) return;
      setStatus("saving");
      setError(null);
      const res = await saveNoteBlocks(campaignId, noteId, data);
      if (res.ok) {
        setStatus("saved");
        setSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      } else {
        setStatus("error");
        setError(res.error);
      }
    },
    [campaignId, noteId],
  );

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const p = pending.current;
    pending.current = null;
    const lp = libPending.current;
    libPending.current = null;
    if (p) await persistBlocks(p);
    if (lp) {
      // Même séquence que persistBlocks (l'écriture bibliothèque est GM seule
      // côté serveur — le joueur n'atteint jamais cette branche).
      setStatus("saving");
      const res = await saveBlockLibrary(campaignId, lp);
      if (res.ok) {
        setStatus("saved");
        setSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      } else {
        setStatus("error");
        setError(res.error);
      }
    }
  }, [campaignId, persistBlocks]);

  useEffect(() => {
    return () => {
      // Sauvegarde de secours : `key={noteId}` détruit l'état à chaque note.
      void flush();
    };
  }, [flush]);

  function scheduleBlocks(next: NoteBlock[]) {
    pending.current = next;
    setStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  }

  function scheduleLib(next: NoteBlock[]) {
    libPending.current = next;
    setStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  }

  const statusLabel =
    status === "saving"
      ? "Enregistrement…"
      : status === "dirty"
        ? "Modifications non enregistrées"
        : status === "error"
          ? (error ?? "Erreur d’enregistrement")
          : status === "saved" && savedAt
            ? `Enregistré à ${savedAt}`
            : "";

  return { status, statusLabel, scheduleBlocks, scheduleLib };
}
