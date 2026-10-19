/**
 * Logique pure d'autosave de l'éditeur de chapitres (Phase 7) —
 * extraite de `chapter-editor.tsx` pour être testable sans DOM :
 * le storage est injecté (localStorage en prod, Map en test).
 */
import type { JSONContent } from "@tiptap/core";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export const AUTOSAVE_MS = 1_000;

export const SAVE_LABELS: Record<SaveState, string> = {
  idle: "À jour",
  dirty: "Enregistrement…",
  saving: "Enregistrement…",
  saved: "Enregistré ✓",
  error: "Erreur de sauvegarde — brouillon local conservé",
};

/** Sous-ensemble de `Storage` utilisé par l'autosave (injection). */
export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface ChapterDraft {
  t?: number;
  content: JSONContent;
  wordCount?: number;
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Clé de brouillon localStorage par (roman, chapitre). */
export function draftStorageKey(novelId: string, chapterId: string): string {
  return `aetheris:draft:${novelId}:${chapterId}`;
}

/** Écrit le brouillon local (survit à une fermeture brutale de l'onglet). */
export function saveDraft(
  storage: DraftStorage,
  key: string,
  content: JSONContent,
  wordCount: number,
  now: number = Date.now(),
): void {
  storage.setItem(key, JSON.stringify({ t: now, content, wordCount }));
}

/**
 * Lit un brouillon : `null` si absent, illisible (localStorage verrouillé)
 * ou corrompu (clé nettoyée dans ce dernier cas).
 */
export function loadDraft(storage: DraftStorage, key: string): ChapterDraft | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Partial<ChapterDraft>;
    if (!draft.content) return null;
    return draft as ChapterDraft;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

/** Efface le brouillon — appelé à chaque sauvegarde réussie. */
export function clearDraft(storage: DraftStorage, key: string): void {
  storage.removeItem(key);
}
