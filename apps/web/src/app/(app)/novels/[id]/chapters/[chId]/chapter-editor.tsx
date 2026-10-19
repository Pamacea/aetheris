"use client";

import Link from "next/link";
import { EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { SAVE_LABELS } from "@/lib/novel-autosave";
import { IconChevronLeft } from "../../../icons";
import { useChapterAutosave } from "./chapter-editor-autosave";
import { ChapterEditorToolbar } from "./chapter-editor-toolbar";
import { ChapterTitleInput } from "./chapter-title";

interface ChapterEditorProps {
  novelId: string;
  novelTitle: string;
  chapterId: string;
  chapterTitle: string;
  content: JSONContent | null;
  status: string;
  readOnly: boolean;
}

/**
 * Éditeur de chapitre : panneau centré, autosave debounce 1 s (indicateur
 * d'état + brouillon localStorage), compteur de mots live.
 *
 * Raccourci : la barre d'outils est collée en bas (sticky bottom) — la nav
 * de l'application occupe déjà `top-0` en sticky et un second bandeau haut
 * se retrouverait masqué dessous. À passer en top si la nav devient
 * non-collante ou porte une variable de hauteur.
 */
export function ChapterEditor({
  novelId,
  novelTitle,
  chapterTitle,
  chapterId,
  content,
  status,
  readOnly,
}: ChapterEditorProps) {
  const { editor, saveState, words, restored } = useChapterAutosave({
    novelId,
    chapterId,
    content,
    readOnly,
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="bar flex flex-wrap items-center gap-3 pt-8 pb-4">
        <Link href={`/novels/${novelId}`} className="btn shrink-0 px-3 py-1.5 text-xs">
          <IconChevronLeft className="h-3 w-3" />
          {novelTitle}
        </Link>

        {readOnly ? (
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{chapterTitle}</span>
        ) : (
          <ChapterTitleInput
            novelId={novelId}
            chapterId={chapterId}
            title={chapterTitle}
            className="font-medium"
          />
        )}

        {status === "published" && (
          <span className="shrink-0 border border-accent bg-accent/10 px-1.5 py-0.5 text-[0.6rem] tracking-widest text-accent uppercase">
            Publié
          </span>
        )}

        {readOnly && (
          <span className="shrink-0 font-mono text-[0.65rem] text-muted">
            {words.toLocaleString("fr-FR")} mots
          </span>
        )}
      </header>

      {restored && !readOnly && (
        <p className="border-b border-accent/40 bg-accent/10 px-5 py-1.5 text-center text-xs text-accent">
          Brouillon local restauré — il sera sauvegardé automatiquement.
        </p>
      )}

      <main className="flex flex-1 justify-center px-4 py-6">
        <div
          className="panel px-8 py-12 shadow-[0_0_60px_rgba(0,0,0,0.45)]"
          style={{ width: "min(100%, 46rem)" }}
        >
          <EditorContent editor={editor} />
        </div>
      </main>

      {!readOnly && (
        <footer className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
          {/* Barre centrée horizontalement dans la colonne d'édition ;
              la ligne du bas porte l'état de sauvegarde et le compteur. */}
          <div className="bar flex flex-col items-center gap-1.5 px-4 py-2">
            <ChapterEditorToolbar editor={editor} />
            <div className="flex w-full items-center gap-4">
              <span
                aria-live="polite"
                className={`shrink-0 text-[0.65rem] ${
                  saveState === "error" ? "text-destructive" : "text-muted"
                }`}
              >
                {SAVE_LABELS[saveState]}
              </span>
              <span className="ml-auto shrink-0 font-mono text-[0.65rem] text-muted">
                {words.toLocaleString("fr-FR")} mots
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
