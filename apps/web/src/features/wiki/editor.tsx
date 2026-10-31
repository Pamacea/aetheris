"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, useRef } from "react";
import { blockContentOf, type BlockPayload } from "./block-defs";
import {
  DiceBlockNode,
  GmSecretNode,
  TableBlockNode,
  WikiLinkMark,
  createSlashExtension,
  createWikiLinkExtension,
} from "./extensions";

interface WikiEditorProps {
  noteId: string;
  contentHtml: string;
  notes: { id: string; title: string }[];
  isGM: boolean;
  onChange: (noteId: string, html: string) => void;
  /** `id` : cible stable des liens récents (absent des liens antérieurs). */
  onWikiLinkClick: (title: string, id?: string) => void;
  /** Publie l'inserteur de blocs vers la barre d'actions de l'en-tête. */
  registerInsert: (insert: ((payload: BlockPayload) => void) | null) => void;
}

/**
 * Éditeur TipTap d'une note. Remonté à chaque changement de note
 * (clé `noteId`) : pas d'effet de synchronisation de contenu.
 * Tous les blocs sont insérés dans le flux du document.
 */
export function WikiEditor({
  noteId,
  contentHtml,
  notes,
  isGM,
  onChange,
  onWikiLinkClick,
  registerInsert,
}: WikiEditorProps) {
  const handlers = useRef({ onChange, onWikiLinkClick, noteId });
  // Aucun curseur enregistré (éditeur jamais focalisé) → insertion en fin de doc.
  const hadFocus = useRef(false);
  useEffect(() => {
    handlers.current = { onChange, onWikiLinkClick, noteId };
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Link entre en conflit avec WikiLinkMark (parse de tout <a[href]> et
        // perte de data-wiki-link) : seuls les wikilinks [[…]] sont autorisés.
        link: false,
      }),
      Placeholder.configure({
        placeholder: "Rédiger la note… Tapez / pour les commandes, [[ pour un lien.",
      }),
      WikiLinkMark,
      GmSecretNode,
      DiceBlockNode,
      TableBlockNode,
      createSlashExtension({ isGM }),
      createWikiLinkExtension(notes),
    ],
    content: contentHtml,
    // Lecture seule pour le joueur : son HTML est strippé des gm-secrets,
    // toute édition re-sauvegardée détruirait les secrets MJ.
    editable: isGM,
    editorProps: {
      attributes: {
        class: "wiki-prose",
        spellcheck: "false",
      },
      handleClick(_view, _pos, event) {
        const anchor = (event.target as HTMLElement).closest("a[data-wiki-link]");
        if (anchor) {
          event.preventDefault();
          const title = anchor.getAttribute("data-wiki-link");
          const id = anchor.getAttribute("data-wiki-link-id") ?? undefined;
          if (title) handlers.current.onWikiLinkClick(title, id);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      handlers.current.onChange(handlers.current.noteId, ed.getHTML());
    },
    onFocus: () => {
      hadFocus.current = true;
    },
  });

  // La palette vit dans l'en-tête : elle insère via l'instance courante.
  useEffect(() => {
    if (!editor) return;
    registerInsert((payload) => {
      const end = editor.state.doc.content.size;
      const range = hadFocus.current ? editor.state.selection : { from: end, to: end };
      editor.chain().focus().insertContentAt(range, blockContentOf(payload)).run();
    });
    return () => registerInsert(null);
  }, [editor, registerInsert]);

  if (!editor) return null;

  return (
    <div className="flex min-h-full flex-col">
      <EditorContent editor={editor} />
    </div>
  );
}
