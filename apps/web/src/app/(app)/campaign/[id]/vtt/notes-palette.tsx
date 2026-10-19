"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createWikiNote } from "../wiki/actions";
import { OPEN_NOTE_EVENT, PaletteSection, type PaletteNote } from "./palette-item";

export { NOTE_MIME, OPEN_NOTE_EVENT } from "./palette-item";
export type { NoteDragPayload } from "./palette-item";

function emitOpenNote(noteId: string) {
  window.dispatchEvent(new CustomEvent(OPEN_NOTE_EVENT, { detail: noteId }));
}

interface NotesPaletteProps {
  campaignId: string;
  notes: PaletteNote[];
  /** MJ uniquement : affiche le bouton « + PNJ ». */
  isGM?: boolean;
  /** Template de catégorie « Personnages » de « + PNJ » (null = note libre). */
  pnjTemplateId?: string | null;
  /** Clic sur une note : l'ouvre dans le panneau (parent client). */
  onOpenNote?: (noteId: string) => void;
}

/**
 * Palette de notes (panneau Lore) : deux sections, « Notes » (libres) et
 * « Personnages » (fiches liées à un template, badge = nom du template).
 * Chaque entrée se glisse sur la canvas (drag & drop Wiki → token) ; un simple
 * clic ouvre la note dans le panneau Lore.
 */
export function NotesPalette({
  campaignId,
  notes,
  isGM = false,
  pnjTemplateId = null,
  onOpenNote,
}: NotesPaletteProps) {
  const router = useRouter();
  /** Repli sans callback : page.tsx est un Server Component, VttApp écoute l'évènement. */
  const open = (noteId: string) => (onOpenNote ?? emitOpenNote)(noteId);

  const fiches = notes.filter((n) => n.templateName !== null);
  const libres = notes.filter((n) => n.templateName === null);

  /** Création d'un PNJ côté palette, puis re-fetch du Server Component (pattern wiki-app). */
  async function addPnj() {
    const title = window.prompt("Nom du PNJ :", "Nouveau PNJ");
    if (!title?.trim()) return;
    const res = await createWikiNote(campaignId, {
      title: title.trim(),
      ...(pnjTemplateId ? { templateId: pnjTemplateId } : {}),
    });
    if (res.ok) router.refresh();
    else window.alert(res.error);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.65rem] text-muted">
          Glissez une note sur la table pour créer un token lié.
        </p>
        {isGM && (
          <button
            type="button"
            onClick={addPnj}
            className="btn shrink-0 px-2 py-1 text-xs"
            title={
              pnjTemplateId
                ? "Créer une fiche PNJ"
                : "Créer une note (aucun modèle « Personnages »)"
            }
          >
            + PNJ
          </button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs text-muted">Aucune note — créez des PNJ dans le wiki.</p>
        ) : (
          <>
            <PaletteSection
              id="palette-notes"
              label="Notes"
              items={libres}
              empty="Aucune note libre."
              onOpen={open}
            />
            <PaletteSection
              id="palette-personnages"
              label="Personnages"
              items={fiches}
              empty="Aucun personnage."
              onOpen={open}
            />
          </>
        )}
      </div>
      <Link href={`/campaign/${campaignId}/wiki`} className="btn px-2 py-1 text-center text-xs">
        Ouvrir le wiki
      </Link>
    </div>
  );
}
