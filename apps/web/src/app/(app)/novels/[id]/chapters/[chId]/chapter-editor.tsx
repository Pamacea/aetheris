"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { SAVE_LABELS } from "@/lib/novel-autosave";
import { CycleStatus } from "@/components/cycle-status";
import { CHAPTER_STATES, type ChapterStatus } from "@/features/novels/logic";
import { updateChapter } from "@/features/novels/actions";
import { IconChevronLeft } from "../../../icons";
import { useChapterAutosave } from "./chapter-editor-autosave";
import { ChapterEditorToolbar } from "./chapter-editor-toolbar";
import { EditorBubbleMenu } from "./chapter-editor-bubble-menu";
import { EditorSlashMenu } from "./chapter-editor-slash-menu";
import { ChapterDrawer } from "./chapter-drawer";
import { ChapterTitleInput } from "./chapter-title";

interface ChapterEditorProps {
  novelId: string;
  novelTitle: string;
  chapterId: string;
  chapterTitle: string;
  content: JSONContent | null;
  status: string;
  readOnly: boolean;
  chapters: { id: string; title: string; status: string }[];
}

/**
 * Éditeur de chapitre plein écran : barre de mise en forme visible par défaut
 * (repliable via « Aa »), colonne de lecture 75ch centrée, bubble menu
 * contextuel à la sélection, menu « / », tiroir des chapitres et barre de
 * statut discrète (mots, temps de lecture, autosave).
 */
export function ChapterEditor({
  novelId,
  novelTitle,
  chapterTitle,
  chapterId,
  content,
  status,
  readOnly,
  chapters,
}: ChapterEditorProps) {
  const { editor, saveState, words, restored } = useChapterAutosave({
    novelId,
    chapterId,
    content,
    readOnly,
  });
  const router = useRouter();
  const [showToolbar, setShowToolbar] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const closeDrawer = useCallback(() => setShowDrawer(false), []);
  const readingMinutes = Math.ceil(words / 200);

  // Statut cyclable depuis l'éditeur, resynchronisé quand le serveur confirme.
  const [chapterStatus, setChapterStatus] = useState(status);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [prevStatus, setPrevStatus] = useState(status);
  if (prevStatus !== status) {
    setPrevStatus(status);
    setChapterStatus(status);
  }

  function cycleStatus(next: string) {
    const previous = chapterStatus;
    setChapterStatus(next);
    setStatusError(null);
    startTransition(async () => {
      const res = await updateChapter(novelId, chapterId, { status: next as ChapterStatus });
      if (!res.ok) {
        setChapterStatus(previous);
        setStatusError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full px-4 lg:w-3/4 flex flex-wrap items-stretch gap-2 pt-3 pb-2">
        <Link href={`/novels/${novelId}`} className="btn h-9 shrink-0 px-2 text-[0.65rem]">
          <IconChevronLeft className="h-3 w-3" />
          {novelTitle}
        </Link>

        {readOnly ? (
          <span className="min-w-0 flex-1 self-center truncate text-sm text-muted">
            {chapterTitle}
          </span>
        ) : (
          <ChapterTitleInput
            novelId={novelId}
            chapterId={chapterId}
            title={chapterTitle}
            className="h-9 py-1 text-sm font-medium"
          />
        )}

        {readOnly ? (
          status === "published" && (
            <span className="shrink-0 self-center border border-accent bg-accent/10 px-1.5 py-0.5 text-[0.6rem] tracking-widest text-accent uppercase">
              Publié
            </span>
          )
        ) : (
          <CycleStatus
            states={CHAPTER_STATES}
            current={chapterStatus}
            onCycle={cycleStatus}
            className="h-9 shrink-0 px-3 text-[0.6rem] tracking-widest"
            legend="Statut du chapitre"
          />
        )}

        {!readOnly && (
          <Link
            href={`/novels/${novelId}/chapters/${chapterId}/print`}
            target="_blank"
            rel="noopener"
            className="btn h-9 shrink-0 px-3 text-[0.6rem] tracking-widest"
          >
            Export
          </Link>
        )}

        {statusError && (
          <p role="alert" className="self-center text-xs text-destructive">
            {statusError}
          </p>
        )}

        {readOnly && (
          <span className="shrink-0 self-center font-mono text-[0.65rem] text-muted">
            {words.toLocaleString("fr-FR")} mots
          </span>
        )}

        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowToolbar((v) => !v)}
            aria-expanded={showToolbar}
            aria-controls="chapter-toolbar"
            aria-label={showToolbar ? "Masquer la mise en forme" : "Afficher la mise en forme"}
            title={showToolbar ? "Masquer la mise en forme" : "Afficher la mise en forme"}
            className="btn h-9 shrink-0 px-1.5 text-[0.65rem]"
          >
            Aa
          </button>
        )}
      </header>

      {restored && !readOnly && (
        <p className="border-b border-accent/40 bg-accent/10 px-5 py-1.5 text-center text-xs text-accent">
          Brouillon local restauré — il sera sauvegardé automatiquement.
        </p>
      )}

      {!readOnly && (
        <div
          id="chapter-toolbar"
          hidden={!showToolbar}
          className="sticky top-[3.75rem] z-30 bg-background/95 backdrop-blur"
        >
          <div className="mx-auto w-full px-4 py-1.5 lg:w-3/4">
            <ChapterEditorToolbar editor={editor} />
          </div>
        </div>
      )}

      <main className="flex-1 py-2">
        <div className="mx-auto w-full px-4 lg:w-3/4">
          <div className="relative mx-auto w-full max-w-[62ch]">
            <EditorContent editor={editor} />
            {editor && !readOnly && (
              <>
                <EditorBubbleMenu
                  editor={editor}
                  showToolbar={showToolbar}
                  onToggleToolbar={() => setShowToolbar((v) => !v)}
                />
                <EditorSlashMenu editor={editor} />
              </>
            )}
          </div>
        </div>
      </main>

      {!readOnly && (
        <footer className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
          <div className="flex h-9 w-full items-stretch pr-4 text-[0.65rem] text-muted">
            <button
              type="button"
              onClick={() => setShowDrawer((v) => !v)}
              aria-expanded={showDrawer}
              aria-controls="chapter-drawer"
              className="btn h-full shrink-0 border-y-0 px-4 py-0 text-[0.6rem] tracking-widest uppercase [clip-path:none]"
            >
              Chapitres
            </button>
            <div className="flex flex-1 items-center justify-center gap-6 py-0">
              <span className="font-mono">{words.toLocaleString("fr-FR")} mots</span>
              <span>{readingMinutes} min de lecture</span>
              <span
                aria-live="polite"
                className={saveState === "error" ? "text-destructive" : undefined}
              >
                {SAVE_LABELS[saveState]}
              </span>
            </div>
            <div aria-hidden className="w-24 shrink-0" />
          </div>
        </footer>
      )}

      {!readOnly && (
        <ChapterDrawer
          novelId={novelId}
          currentChapterId={chapterId}
          chapters={chapters}
          open={showDrawer}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
