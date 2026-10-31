"use client";

import { ChapterListItems } from "./chapter-list-items";
import { useChapterOps } from "./chapter-state";

export interface ChapterRow {
  id: string;
  title: string;
  position: number;
  status: string;
  wordCount: number;
}

/**
 * Liste de chapitres de l'auteur : création rapide (Entrée), rename inline,
 * drag de réordonnancement (HTML5 natif), statut et suppression via menu
 * contextuel.
 */
export function ChapterList({ novelId, chapters }: { novelId: string; chapters: ChapterRow[] }) {
  const ops = useChapterOps(novelId, chapters);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
        <span className="mark-tri" aria-hidden />
        Chapitres
      </h2>

      {ops.error && <p className="text-sm text-destructive">{ops.error}</p>}

      <ChapterListItems
        novelId={novelId}
        rows={ops.rows}
        pending={ops.pending}
        editingId={ops.editingId}
        draftTitle={ops.draftTitle}
        dragId={ops.dragId}
        setEditingId={ops.setEditingId}
        setDraftTitle={ops.setDraftTitle}
        onCommitRename={ops.commitRename}
        onStatusChange={ops.setStatus}
        onRemove={ops.removeChapter}
        onDrop={ops.onDrop}
        onAdd={ops.addChapter}
      />
    </section>
  );
}
