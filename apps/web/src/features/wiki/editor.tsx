"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, useRef } from "react";
import { BlocksPalette } from "./blocks-palette";
import { BLOCK_MIME, insertBlockAt, readPayload } from "./blocks-dnd";
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
 * Palette de blocs (MJ) + drop : le bloc est inséré à la position visée.
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
  // Copie locale : le rétrécissement de type ne descend pas dans les closures.
  const ed = editor;

  // Drop d'un chip de palette : insertion à la position visée (fin de doc
  // si les coordonnées ne tombent sur aucune position).
  function handleDrop(e: React.DragEvent) {
    const payload = readPayload(e);
    if (!payload) return;
    e.preventDefault();
    const at = ed.view.posAtCoords({ left: e.clientX, top: e.clientY });
    insertBlockAt(ed, payload, at?.pos ?? null);
  }

  function handleDragOver(e: React.DragEvent) {
    // Seuls nos chips autorisent le drop : les glisser-dépos externes (fichiers,
    // texte) restent gérés par ProseMirror.
    if (!e.dataTransfer.types.includes(BLOCK_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  return (
    <div className="flex flex-col" onDragOver={handleDragOver} onDrop={handleDrop}>
      {isGM && <BlocksPalette onInsert={(p) => insertBlockAt(ed, p, null)} />}
      <EditorContent editor={ed} />
    </div>
  );
}
