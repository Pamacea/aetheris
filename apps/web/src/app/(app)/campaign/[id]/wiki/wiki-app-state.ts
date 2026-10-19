"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { listWikiVersions, restoreWikiVersion } from "./actions";
import type { useWikiAutosave } from "./wiki-app-autosave";
import type { WikiAppProps } from "./wiki-app-types";

type Autosave = ReturnType<typeof useWikiAutosave>;
type Notes = WikiAppProps["notes"];

/**
 * État du wiki (notes locales, historique des versions, restauration,
 * navigation) — extrait pour garder WikiApp sous le budget hooks.
 */
export function useWikiAppState(campaignId: string, notes: Notes, autosave: Autosave) {
  const router = useRouter();

  // Les notes locales suivent les actions optimistes (création/renommage)
  // puis se resynchronisent quand le serveur renvoie les props.
  const [localNotes, setLocalNotes] = useState(notes);
  const [prevNotes, setPrevNotes] = useState(notes);
  if (prevNotes !== notes) {
    setPrevNotes(notes);
    setLocalNotes(notes);
  }

  const [newOpen, setNewOpen] = useState(false);
  const [history, setHistory] = useState<{ id: string; createdAt: string }[] | null>(null);
  // Contenu restauré local : re-clé l'éditeur sans attendre le refresh serveur.
  const [restored, setRestored] = useState<{ id: string; html: string; rev: number } | null>(null);

  const flush = autosave.flush;
  const selectNote = useCallback(
    async (id: string) => {
      await flush();
      router.push(`/campaign/${campaignId}/wiki?note=${id}`);
    },
    [flush, campaignId, router],
  );

  async function openHistory(activeId: string | null) {
    if (!activeId) return;
    const res = await listWikiVersions(campaignId, activeId);
    if (res.ok) setHistory(res.versions);
  }

  async function handleRestore(activeId: string | null, versionId: string) {
    if (!activeId) return;
    const res = await restoreWikiVersion(campaignId, activeId, versionId);
    if (res.ok) {
      setHistory(null);
      autosave.setStatus("saved");
      autosave.clearPending();
      setRestored((r) => ({ id: activeId, html: res.contentHtml, rev: (r?.rev ?? 0) + 1 }));
      router.refresh();
    }
  }

  return {
    localNotes,
    setLocalNotes,
    newOpen,
    setNewOpen,
    history,
    setHistory,
    restored,
    selectNote,
    openHistory,
    handleRestore,
  };
}
