"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, useRef } from "react";
import {
  DiceBlockNode,
  GmSecretNode,
  MetaBlockNode,
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
  onWikiLinkClick: (title: string) => void;
}

/**
 * Éditeur TipTap d'une note. Remonté à chaque changement de note
 * (clé `noteId`) : pas d'effet de synchronisation de contenu.
 */
export function WikiEditor({
  noteId,
  contentHtml,
  notes,
  isGM,
  onChange,
  onWikiLinkClick,
}: WikiEditorProps) {
  const handlers = useRef({ onChange, onWikiLinkClick, noteId });
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
      MetaBlockNode,
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
          if (title) handlers.current.onWikiLinkClick(title);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      handlers.current.onChange(handlers.current.noteId, ed.getHTML());
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
