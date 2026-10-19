"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { fold } from "@/lib/text";
import { createWikiEntry } from "./actions";
import { useWikiAutosave } from "./autosave";
import { WikiEditor } from "./editor";
import { EntriesPanel } from "./entries-panel";
import { WikiAppHistory } from "./history";
import { NoteHeader } from "./note-header";
import { useWikiAppState } from "./wiki-app-state";
import type { WikiAppProps } from "./types";

export type { WikiActiveEntry, WikiEntryMeta, WikiAppProps } from "./types";

/** Wiki : panneau d'entrées à gauche, éditeur TipTap au centre. */
export function WikiApp({ campaignId, entries, active, isGM }: WikiAppProps) {
  const router = useRouter();
  const autosave = useWikiAutosave(campaignId);
  const w = useWikiAppState(campaignId, entries, autosave);
  const { localEntries, selectEntry, setLocalEntries } = w;
  const flush = autosave.flush;

  // Clic sur un [[lien]] : résolu → navigation ; inconnu → création (MJ).
  const handleWikiLink = useCallback(
    async (title: string) => {
      const target = localEntries.find((n) => fold(n.title) === fold(title));
      if (target) {
        await selectEntry(target.id);
        return;
      }
      await flush();
      if (!isGM) return;
      const res = await createWikiEntry(campaignId, { title });
      if (res.ok) {
        setLocalEntries((prev) => [...prev, { id: res.id, title, folder: null }]);
        router.push(`/campaign/${campaignId}/wiki?note=${res.id}`);
      }
    },
    [campaignId, flush, isGM, localEntries, router, selectEntry, setLocalEntries],
  );

  const restored = w.restored && w.restored.id === active?.id ? w.restored : null;

  return (
    <div className="flex min-h-0 flex-1">
      <EntriesPanel
        campaignId={campaignId}
        entries={w.localEntries}
        isGM={isGM}
        active={active}
        newOpen={w.newOpen}
        setNewOpen={w.setNewOpen}
        selectEntry={w.selectEntry}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <NoteHeader
              // Clé entrée : ferme le formulaire de métadonnées au changement.
              key={active.id}
              active={active}
              campaignId={campaignId}
              isGM={isGM}
              status={autosave.status}
              savedAt={autosave.savedAt}
              setLocalEntries={w.setLocalEntries}
              onHistory={() => void w.openHistory(active.id)}
            />
            <div className="flex-1 overflow-y-auto px-5 py-6 md:px-10">
              <WikiEditor
                key={`${active.id}:${restored?.rev ?? 0}`}
                noteId={active.id}
                contentHtml={restored ? restored.html : active.contentHtml}
                notes={w.localEntries.map((n) => ({ id: n.id, title: n.title }))}
                isGM={isGM}
                onChange={autosave.handleChange}
                onWikiLinkClick={(t) => void handleWikiLink(t)}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
            <p className="text-muted">Cette campagne n’a encore aucune entrée.</p>
            {isGM && (
              <button
                type="button"
                className="btn btn-primary px-4 py-2"
                onClick={() => w.setNewOpen(true)}
              >
                Créer la première entrée
              </button>
            )}
          </div>
        )}
      </main>

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
