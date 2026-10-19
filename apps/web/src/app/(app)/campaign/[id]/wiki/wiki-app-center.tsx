"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { createWikiNote } from "./actions";
import { WikiEditor } from "./editor";
import { TemplateForm, type FormSaveStatus } from "./template-form";
import type { SaveStatus } from "./wiki-app-autosave";
import { WikiNoteHeader } from "./wiki-app-note-header";
import { fold } from "./wiki-app-utils";
import type { WikiActiveNote, WikiNoteMeta, WikiTemplateMeta } from "./wiki-app-types";

/** Zone centrale : en-tête, fiche structurée, éditeur (ou état vide). */
export function WikiAppCenter({
  campaignId,
  active,
  isGM,
  localNotes,
  setLocalNotes,
  templates,
  restored,
  status,
  savedAt,
  setStatus,
  setSavedAt,
  selectNote,
  setNewOpen,
  handleChange,
  flush,
  onHistory,
}: {
  campaignId: string;
  active: WikiActiveNote | null;
  isGM: boolean;
  localNotes: WikiNoteMeta[];
  setLocalNotes: React.Dispatch<React.SetStateAction<WikiNoteMeta[]>>;
  templates: WikiTemplateMeta[];
  restored: { id: string; html: string; rev: number } | null;
  status: SaveStatus;
  savedAt: string | null;
  setStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
  setSavedAt: (v: string | null) => void;
  selectNote: (id: string) => Promise<void>;
  setNewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleChange: (noteId: string, html: string) => void;
  flush: () => Promise<void>;
  onHistory: () => void;
}) {
  const router = useRouter();

  const handleWikiLink = useCallback(
    async (title: string) => {
      const target = localNotes.find((n) => fold(n.title) === fold(title));
      if (target) {
        await selectNote(target.id);
        return;
      }
      await flush();
      // Cote serveur réservé MJ : pas d'appel inutile pour un joueur.
      if (!isGM) return;
      const res = await createWikiNote(campaignId, { title });
      if (res.ok) {
        setLocalNotes((prev) => [...prev, { id: res.id, title, folder: null, type: "note" }]);
        router.push(`/campaign/${campaignId}/wiki?note=${res.id}`);
      }
    },
    [campaignId, flush, isGM, localNotes, router, selectNote, setLocalNotes],
  );

  /** Statut du formulaire de fiche → en-tête (indicateur « Enregistré… »). */
  const handleFormStatus = (s: FormSaveStatus) => {
    setStatus(s);
    if (s === "saved") {
      setSavedAt(
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      {active ? (
        <>
          <WikiNoteHeader
            // Clé note : ferme le formulaire de métadonnées au changement
            // de note (sinon titre/dossier de l'ancienne note restent ouverts).
            key={active.id}
            active={active}
            campaignId={campaignId}
            isGM={isGM}
            status={status}
            savedAt={savedAt}
            setLocalNotes={setLocalNotes}
            onHistory={onHistory}
          />

          {active.template && (
            <TemplateForm
              key={`form-${active.id}`}
              campaignId={campaignId}
              entityId={active.id}
              schemaRaw={active.template.schema}
              initialData={active.data}
              notes={localNotes}
              templates={templates}
              onStatus={handleFormStatus}
              onNavigate={(noteId) => void selectNote(noteId)}
            />
          )}

          <div className="flex-1 overflow-y-auto px-5 py-6 md:px-10">
            <WikiEditor
              key={`${active.id}:${restored && restored.id === active.id ? restored.rev : 0}`}
              noteId={active.id}
              contentHtml={
                restored && restored.id === active.id ? restored.html : active.contentHtml
              }
              notes={localNotes.map((n) => ({ id: n.id, title: n.title }))}
              isGM={isGM}
              onChange={handleChange}
              onWikiLinkClick={(t) => void handleWikiLink(t)}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
          <p className="text-muted">Cette campagne n’a encore aucune note.</p>
          <button
            type="button"
            className="btn btn-primary px-4 py-2"
            onClick={() => setNewOpen(true)}
          >
            Créer la première note
          </button>
        </div>
      )}
    </main>
  );
}
