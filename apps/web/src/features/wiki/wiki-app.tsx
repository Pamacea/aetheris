"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { withEmbed } from "@/components/campaigns/embed-mode";
import { fold } from "@/lib/text";
import { createWikiEntry } from "./actions";
import { useWikiAutosave } from "./autosave";
import { BacklinksMobile, BacklinksPanel } from "./backlinks-panel";
import { WikiEditor } from "./editor";
import { EntriesPanel } from "./entries-panel";
import { WikiAppHistory } from "./history";
import { NoteHeader } from "./note-header";
import { TemplateForm } from "./templates/template-form";
import { useWikiAppState } from "./wiki-app-state";
import type { WikiAppProps } from "./types";

export type { WikiActiveEntry, WikiEntryMeta, WikiAppProps, WikiTemplateMeta } from "./types";

/** Wiki : panneau d'entrées à gauche, éditeur TipTap au centre, liens entrants à droite. */
export function WikiApp({ campaignId, entries, active, templates, backlinks, isGM }: WikiAppProps) {
  const router = useRouter();
  const autosave = useWikiAutosave(campaignId);
  const w = useWikiAppState(campaignId, entries, autosave);
  const { localEntries, selectEntry, setLocalEntries } = w;
  const flush = autosave.flush;

  // Clic sur un [[lien]] : résolu → navigation ; inconnu → création (MJ).
  const handleWikiLink = useCallback(
    async (title: string, id?: string) => {
      // L'id est prioritaire : le lien reste valide après un renommage.
      const target = id
        ? localEntries.find((n) => n.id === id)
        : localEntries.find((n) => fold(n.title) === fold(title));
      if (target) {
        await selectEntry(target.id);
        return;
      }
      await flush();
      if (!isGM) return;
      const res = await createWikiEntry(campaignId, { title });
      if (res.ok) {
        setLocalEntries((prev) => [...prev, { id: res.id, title, folder: null, type: "note" }]);
        router.push(withEmbed(`/campaign/${campaignId}/wiki?note=${res.id}`));
      }
    },
    [campaignId, flush, isGM, localEntries, router, selectEntry, setLocalEntries],
  );

  // Statut du formulaire de fiche → même indicateur que l'éditeur.
  const handleFormStatus = (s: "saving" | "saved" | "error") => {
    autosave.setStatus(s);
    if (s === "saved") {
      autosave.setSavedAt(
        new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      );
    }
  };

  const restored = w.restored && w.restored.id === active?.id ? w.restored : null;

  return (
    <div className="flex min-h-0 flex-1">
      <EntriesPanel
        campaignId={campaignId}
        entries={w.localEntries}
        templates={templates}
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

            {/* Sous `lg`, le panneau latéral des liens entrants est masqué :
                ce bouton ouvre la même liste dans une modale. */}
            <section
              aria-label="Liens entrants"
              className="flex items-center justify-end border-b border-border px-5 py-1 lg:hidden"
            >
              <BacklinksMobile backlinks={backlinks} selectEntry={w.selectEntry} />
            </section>

            {active.template && (
              <TemplateForm
                key={`form-${active.id}`}
                campaignId={campaignId}
                entityId={active.id}
                schemaRaw={active.template.schema}
                initialData={active.data}
                notes={w.localEntries}
                templates={templates}
                onStatus={handleFormStatus}
                onNavigate={(id) => void selectEntry(id)}
              />
            )}

            <div className="flex-1 overflow-y-auto px-5 py-6 md:px-10">
              <WikiEditor
                key={`${active.id}:${restored?.rev ?? 0}`}
                noteId={active.id}
                contentHtml={restored ? restored.html : active.contentHtml}
                notes={w.localEntries.map((n) => ({ id: n.id, title: n.title }))}
                isGM={isGM}
                onChange={autosave.handleChange}
                onWikiLinkClick={(t, id) => void handleWikiLink(t, id)}
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

      <BacklinksPanel backlinks={backlinks} selectEntry={w.selectEntry} />

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
