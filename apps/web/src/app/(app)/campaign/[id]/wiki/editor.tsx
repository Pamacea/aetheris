"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, useRef } from "react";
import {
  GmSecretNode,
  MetaBlockNode,
  WikiLinkMark,
  createSlashExtension,
  createWikiLinkExtension,
} from "./extensions";
import { BLOCK_MIME, type BlockDragPayload } from "./blocks-panel";

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
      // Drop depuis la Bibliothèque de blocs : insert <aetheris-block> au point
      // visé. Tout autre drag → false (ProseMirror garde son comportement
      // par défaut : drag de texte interne, images…).
      // shortcut: pas de wrapping gmSecret au drop — position explicite = bloc
      // normal (le slash menu, lui, enveloppe selon le contexte).
      handleDrop(view, event) {
        const raw = event.dataTransfer?.getData(BLOCK_MIME);
        if (!raw) return false;
        try {
          const b = JSON.parse(raw) as BlockDragPayload;
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
          const pos = coords?.pos ?? view.state.selection.head;
          const node = view.state.schema.nodes.metaBlock.create({
            kind: b.kind,
            label: b.label,
            value: b.value ?? "",
          });
          view.dispatch(view.state.tr.insert(pos, node));
          return true;
        } catch {
          return false;
        }
      },
    },
    onUpdate: ({ editor: ed }) => {
      handlers.current.onChange(handlers.current.noteId, ed.getHTML());
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
