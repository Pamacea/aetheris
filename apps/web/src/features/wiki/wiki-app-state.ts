"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { listWikiVersions, restoreWikiVersion } from "./actions";
import type { useWikiAutosave } from "./autosave";
import type { WikiEntryMeta } from "./types";

type Autosave = ReturnType<typeof useWikiAutosave>;

/**
 * État du wiki (entrées locales, historique des versions, restauration,
 * navigation) — extrait pour garder WikiApp sous le budget hooks.
 */
export function useWikiAppState(campaignId: string, entries: WikiEntryMeta[], autosave: Autosave) {
  const router = useRouter();

  // Les entrées locales suivent les actions optimistes (création, rename,
  // suppression) puis se resynchronisent quand le serveur renvoie les props.
  const [localEntries, setLocalEntries] = useState(entries);
  const [prevEntries, setPrevEntries] = useState(entries);
  if (prevEntries !== entries) {
    setPrevEntries(entries);
    setLocalEntries(entries);
  }

  const [newOpen, setNewOpen] = useState(false);
  const [history, setHistory] = useState<{ id: string; createdAt: string }[] | null>(null);
  // Contenu restauré local : re-clé l'éditeur sans attendre le refresh serveur.
  const [restored, setRestored] = useState<{ id: string; html: string; rev: number } | null>(null);

  const flush = autosave.flush;
  const selectEntry = useCallback(
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
    localEntries,
    setLocalEntries,
    newOpen,
    setNewOpen,
    history,
    setHistory,
    restored,
    selectEntry,
    openHistory,
    handleRestore,
  };
}
