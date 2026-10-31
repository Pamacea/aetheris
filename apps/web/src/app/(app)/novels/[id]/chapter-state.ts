"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  createChapter,
  deleteChapter,
  reorderChapters,
  updateChapter,
} from "@/features/novels/actions";
import { moveItem } from "@/features/novels/logic";
import type { ChapterRow } from "./chapter-list";

/**
 * Opérations sur les chapitres (création, rename, statut, suppression,
 * drag) + lignes optimistes — extraites pour garder ChapterList sous le
 * budget hooks.
 */
export function useChapterOps(novelId: string, chapters: ChapterRow[]) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState(chapters);
  // Resynchronisation quand le serveur renvoie de nouvelles lignes
  // (router.refresh()) — pattern « adjusting state during render ».
  const [prevChapters, setPrevChapters] = useState(chapters);
  if (prevChapters !== chapters) {
    setPrevChapters(chapters);
    setRows(chapters);
  }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const dragId = useRef<string | null>(null);

  function addChapter(title?: string) {
    const clean = title?.trim() || "Nouveau chapitre";
    setError(null);
    startTransition(async () => {
      const res = await createChapter(novelId, { title: clean });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function commitRename(id: string) {
    const title = draftTitle.trim();
    setEditingId(null);
    if (!title) return;
    const previous = rows.find((r) => r.id === id)?.title;
    if (title === previous) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, title } : r)));
    setError(null);
    startTransition(async () => {
      const res = await updateChapter(novelId, id, { title });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function setStatus(id: string, status: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    setError(null);
    startTransition(async () => {
      const res = await updateChapter(novelId, id, {
        status: status as "draft" | "review" | "published",
      });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function removeChapter(id: string) {
    setError(null);
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(async () => {
      const res = await deleteChapter(novelId, id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function onDrop(targetId: string) {
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;
    const ordered = rows.map((r) => r.id);
    const from = ordered.indexOf(sourceId);
    const to = ordered.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = moveItem(ordered, from, to);
    setRows((prev) => next.map((id) => prev.find((r) => r.id === id)!));
    setError(null);
    startTransition(async () => {
      const res = await reorderChapters(novelId, next);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return {
    rows,
    pending,
    error,
    editingId,
    draftTitle,
    setEditingId,
    setDraftTitle,
    dragId,
    addChapter,
    commitRename,
    setStatus,
    removeChapter,
    onDrop,
  };
}
