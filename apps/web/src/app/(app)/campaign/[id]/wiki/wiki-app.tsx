"use client";

import { useWikiAutosave } from "./wiki-app-autosave";
import { useWikiAppState } from "./wiki-app-state";
import { WikiAppCenter } from "./wiki-app-center";
import { WikiAppHistory } from "./wiki-app-history";
import { WikiAppSidebar } from "./wiki-app-sidebar";
import { WikiAppSidePanel } from "./wiki-app-side-panel";
import type { WikiAppProps } from "./wiki-app-types";

export type { WikiGraphData, WikiNoteMeta, WikiTemplateMeta } from "./wiki-app-types";

export function WikiApp({
  campaignId,
  notes,
  templates,
  active,
  backlinks,
  graph,
  isGM,
  blockLibrary,
}: WikiAppProps) {
  const autosave = useWikiAutosave(campaignId);
  const w = useWikiAppState(campaignId, notes, autosave);

  return (
    <div className="flex min-h-0 flex-1">
      {/* ── Panneau gauche : dossiers + recherche ── */}
      <WikiAppSidebar
        campaignId={campaignId}
        localNotes={w.localNotes}
        templates={templates}
        isGM={isGM}
        active={active}
        newOpen={w.newOpen}
        setNewOpen={w.setNewOpen}
        selectNote={w.selectNote}
      />

      {/* ── Centre : éditeur ── */}
      <WikiAppCenter
        campaignId={campaignId}
        active={active}
        isGM={isGM}
        localNotes={w.localNotes}
        setLocalNotes={w.setLocalNotes}
        templates={templates}
        restored={w.restored}
        status={autosave.status}
        savedAt={autosave.savedAt}
        setStatus={autosave.setStatus}
        setSavedAt={autosave.setSavedAt}
        selectNote={w.selectNote}
        setNewOpen={w.setNewOpen}
        handleChange={autosave.handleChange}
        flush={autosave.flush}
        onHistory={() => void w.openHistory(active?.id ?? null)}
      />

      {/* ── Panneau droit : backlinks + graphe + blocs ── */}
      <WikiAppSidePanel
        campaignId={campaignId}
        active={active}
        localNotes={w.localNotes}
        backlinks={backlinks}
        graph={graph}
        isGM={isGM}
        blockLibrary={blockLibrary}
        selectNote={w.selectNote}
      />

      {/* ── Historique des versions ── */}
      {w.history && (
        <WikiAppHistory
          history={w.history}
          onClose={() => w.setHistory(null)}
          onRestore={(v) => void w.handleRestore(active?.id ?? null, v)}
        />
      )}
    </div>
  );
}
