"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveWikiNote } from "./actions";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1200;

/** Autosave de l'éditeur : debounce 1,2 s + flush de secours au démontage. */
export function useWikiAutosave(campaignId: string) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const pending = useRef<{ id: string; html: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    setStatus("saving");
    const res = await saveWikiNote(campaignId, p.id, p.html);
    if (res.ok) {
      setStatus("saved");
      setSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } else {
      setStatus("error");
    }
  }, [campaignId]);

  useEffect(() => {
    return () => {
      // Sauvegarde de secours si l'utilisateur change de note/vue vite.
      void flush();
    };
  }, [flush]);

  const handleChange = useCallback(
    (noteId: string, html: string) => {
      pending.current = { id: noteId, html };
      setStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  /** Annule la sauvegarde en attente (ex. restauration de version). */
  const clearPending = useCallback(() => {
    pending.current = null;
  }, []);

  return { status, setStatus, savedAt, setSavedAt, handleChange, flush, clearPending };
}
