"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, useRef, useState } from "react";
import { BlocksPalette } from "./blocks-palette";
import { BLOCK_MIME, insertBlockAt, readPayload, type BlockDragPayload } from "./blocks-dnd";
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
  /** `id` : cible stable des liens récents (absent des liens antérieurs). */
  onWikiLinkClick: (title: string, id?: string) => void;
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
  // Aucun curseur enregistré (éditeur jamais focalisé) → insertion en fin de doc.
  const hadFocus = useRef(false);
  const [dropError, setDropError] = useState<string | null>(null);
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
        // `relative` : conteneur des blocs en position libre (absolu % / px).
        class: "wiki-prose relative",
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

  // Les blocs en position libre sont en absolu : ils n'alimentent pas la
  // hauteur du flux. Le conteneur est agrandi via min-height pour tous les
  // contenir — la largeur, elle, reste bornée à 100 % (responsive).
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const root = editor.view.dom;
      let bottom = 0;
      for (const el of root.querySelectorAll<HTMLElement>("[data-node-view-wrapper]")) {
        bottom = Math.max(bottom, el.offsetTop + el.offsetHeight);
      }
      if (bottom > 0) root.style.setProperty("min-height", `${bottom}px`);
      else root.style.removeProperty("min-height");
    };
    editor.on("update", sync);
    sync();
    window.addEventListener("resize", sync);
    return () => {
      editor.off("update", sync);
      window.removeEventListener("resize", sync);
    };
  }, [editor]);

  if (!editor) return null;
  // Copie locale : le rétrécissement de type ne descend pas dans les closures.
  const ed = editor;

  // Clic palette : remplace la sélection courante, sinon insère au curseur.
  // Sans curseur enregistré, la cible est la fin du document.
  function handleInsert(payload: BlockDragPayload) {
    const selection = hadFocus.current
      ? { from: ed.state.selection.from, to: ed.state.selection.to }
      : null;
    if (insertBlockAt(ed, payload, null, selection)) setDropError(null);
  }

  // Drop d'un chip : position visée uniquement. Hors zone de texte → refus
  // visible (jamais d'insertion silencieuse en fin de document).
  function handleDrop(e: React.DragEvent) {
    const payload = readPayload(e);
    if (!payload) return;
    e.preventDefault();
    const rect = ed.view.dom.getBoundingClientRect();
    const inEditor =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    const at = inEditor ? ed.view.posAtCoords({ left: e.clientX, top: e.clientY }) : null;
    if (!at) {
      setDropError("Déposez le bloc dans la zone de texte de l’entrée.");
      return;
    }
    if (insertBlockAt(ed, payload, at.pos)) {
      setDropError(null);
    } else {
      setDropError("Impossible d’insérer le bloc ici.");
    }
  }

  function handleDragOver(e: React.DragEvent) {
    // Seuls nos chips autorisent le drop : les glisser-dépos externes (fichiers,
    // texte) restent gérés par ProseMirror.
    if (!e.dataTransfer.types.includes(BLOCK_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  return (
    <div className="flex min-h-full flex-col" onDragOver={handleDragOver} onDrop={handleDrop}>
      {isGM && <BlocksPalette onInsert={handleInsert} />}
      {dropError && (
        <p
          role="alert"
          className="-mx-5 border-b border-border bg-card px-5 py-1.5 text-xs text-destructive md:-mx-10 md:px-10"
        >
          {dropError}
        </p>
      )}
      <EditorContent editor={ed} />
    </div>
  );
}
