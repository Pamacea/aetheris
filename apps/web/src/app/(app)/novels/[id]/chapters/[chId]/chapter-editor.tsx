"use client";

import Link from "next/link";
import { EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { SAVE_LABELS } from "@/lib/novel-autosave";
import { useChapterAutosave } from "./chapter-editor-autosave";
import { ChapterEditorToolbar } from "./chapter-editor-toolbar";

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
 * Éditeur plein écran façon Google Docs : page centrée Serif, barre
 * d'outils flottante, autosave debounce 1 s (indicateur d'état + brouillon
 * localStorage), compteur de mots live.
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background/95 px-5 py-2.5 backdrop-blur">
        <Link href={`/novels/${novelId}`} className="btn shrink-0 px-2 py-1 text-xs">
          ← {novelTitle}
        </Link>

        <span className="min-w-0 flex-1 truncate text-sm text-muted">
          {chapterTitle}
          {status === "published" && (
            <span className="ml-2 border border-accent bg-accent/10 px-1.5 py-0.5 text-[0.6rem] tracking-widest text-accent uppercase">
              Publié
            </span>
          )}
        </span>

        {!readOnly && (
          <>
            <ChapterEditorToolbar editor={editor} />
            <span
              aria-live="polite"
              className={`shrink-0 text-[0.65rem] ${
                saveState === "error" ? "text-destructive" : "text-muted"
              }`}
            >
              {SAVE_LABELS[saveState]}
            </span>
          </>
        )}
        <span className="shrink-0 font-mono text-[0.65rem] text-muted">
          {words.toLocaleString("fr-FR")} mots
        </span>
      </header>

      {restored && !readOnly && (
        <p className="border-b border-accent/40 bg-accent/10 px-5 py-1.5 text-center text-xs text-accent">
          Brouillon local restauré — il sera sauvegardé automatiquement.
        </p>
      )}

      <main className="flex flex-1 justify-center px-4 py-10">
        <div className="panel w-full max-w-[46rem] px-10 py-12 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}
