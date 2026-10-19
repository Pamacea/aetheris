"use client";

import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import type { JSONContent } from "@tiptap/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTOSAVE_MS,
  clearDraft,
  countWords,
  draftStorageKey,
  loadDraft,
  saveDraft,
  type SaveState,
} from "@/lib/novel-autosave";
import { saveChapterContent } from "@/features/novels/actions";

interface AutosaveInput {
  novelId: string;
  chapterId: string;
  content: JSONContent | null;
  readOnly: boolean;
}

/**
 * Éditeur Tiptap + autosave debounce 1 s : état de sauvegarde, compteur de
 * mots, brouillon localStorage (restauration + flush à la fermeture).
 */
export function useChapterAutosave({ novelId, chapterId, content, readOnly }: AutosaveInput) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [words, setWords] = useState(0);
  const [restored, setRestored] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const key = draftStorageKey(novelId, chapterId);

  const persist = useCallback(
    async (doc: JSONContent, wordCount: number) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaveState("saving");
      const res = await saveChapterContent(novelId, chapterId, { content: doc, wordCount });
      savingRef.current = false;
      if (res.ok) {
        setSaveState("saved");
        clearDraft(localStorage, key);
      } else {
        setSaveState("error");
      }
    },
    [novelId, chapterId, key],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "Commencez à écrire…" }),
    ],
    content: content ?? "",
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "novel-prose min-h-[60vh] outline-none",
        spellcheck: "true",
      },
    },
    // Comptage initial : onUpdate ne se déclenche qu'à la première édition,
    // donc sans ça le compteur affiche 0 après un simple rechargement.
    onCreate: ({ editor: ed }) => setWords(countWords(ed.getText())),
    onUpdate: ({ editor: ed }) => {
      const wc = countWords(ed.getText());
      setWords(wc);
      setSaveState("dirty");
      // Brouillon local : survit à une fermeture brutale de l'onglet.
      saveDraft(localStorage, key, ed.getJSON(), wc);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void persist(ed.getJSON(), wc);
      }, AUTOSAVE_MS);
    },
  });

  // Restauration d'un brouillon local non sauvegardé (fermeture brutale,
  // erreur réseau…). Le brouillon est effacé à chaque sauvegarde réussie.
  useEffect(() => {
    if (readOnly || !editor) return;
    const draft = loadDraft(localStorage, key);
    if (!draft) return;
    // Hors du corps synchrone de l'effet (règle react-hooks) : on laisse
    // l'éditeur finir son montage avant d'appliquer le brouillon.
    const timer = setTimeout(() => {
      editor.commands.setContent(draft.content);
      setWords(draft.wordCount ?? countWords(editor.getText()));
      setRestored(true);
      setSaveState("dirty");
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor !== null, readOnly]);

  // Sauvegarde à la fermeture : flush immédiat si des changements sont en attente.
  useEffect(() => {
    const flush = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (editor) void persist(editor.getJSON(), countWords(editor.getText()));
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [editor, persist]);

  return { editor, saveState, words, restored };
}
