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
 * Liste de chapitres de l'auteur : création, rename inline, drag de
 * réordonnancement (HTML5 natif), statut et suppression.
 */
export function ChapterList({ novelId, chapters }: { novelId: string; chapters: ChapterRow[] }) {
  const ops = useChapterOps(novelId, chapters);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
          <span className="mark-tri" aria-hidden />
          Chapitres
        </h2>
        <button
          type="button"
          onClick={ops.addChapter}
          disabled={ops.pending}
          className="btn px-3 py-1 text-xs"
        >
          + Nouveau chapitre
        </button>
      </div>

      {ops.error && (
        <p className="border border-destructive/60 px-3 py-2 text-sm text-destructive">
          {ops.error}
        </p>
      )}

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
      />
    </section>
  );
}
