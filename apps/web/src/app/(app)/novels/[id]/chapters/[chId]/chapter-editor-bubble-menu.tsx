"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { HIGHLIGHT } from "./chapter-editor-toolbar";

const btn = (active: boolean) =>
  `px-1.5 py-1 text-xs leading-none transition ${
    active ? "text-accent" : "text-muted hover:text-foreground"
  }`;

/** Barre contextuelle à la sélection : l'essentiel + « Aa » pour le panneau complet. */
export function EditorBubbleMenu({
  editor,
  showToolbar,
  onToggleToolbar,
}: {
  editor: Editor;
  showToolbar: boolean;
  onToggleToolbar: () => void;
}) {
  const flags = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      h1: ed.isActive("heading", { level: 1 }),
      h2: ed.isActive("heading", { level: 2 }),
      link: ed.isActive("link"),
      highlight: ed.isActive("highlight"),
    }),
  });

  // Sous la sélection par défaut : la toolbar sticky (haut) ne peut plus le
  // masquer. Près du bas, `flip` le repasse au-dessus ; les paddings gardent
  // une marge avec la toolbar (~120px) et le footer sticky (~80px).
  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "bottom",
        offset: 12,
        flip: { padding: { top: 132, bottom: 80, left: 12, right: 12 } },
        shift: { padding: 12 },
      }}
      shouldShow={({ state }) => !state.selection.empty}
      role="toolbar"
      aria-label="Mise en forme rapide"
      className="z-40 flex items-center gap-0.5 border border-border bg-background/95 p-1 shadow-[0_6px_24px_rgba(0,0,0,0.45)] backdrop-blur"
    >
      <button
        type="button"
        className={`${btn(flags.bold)} font-bold`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Gras"
        aria-pressed={flags.bold}
      >
        B
      </button>
      <button
        type="button"
        className={`${btn(flags.italic)} italic`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italique"
        aria-pressed={flags.italic}
      >
        I
      </button>
      <button
        type="button"
        className={`${btn(flags.underline)} underline`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Souligné"
        aria-pressed={flags.underline}
      >
        U
      </button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      {([1, 2] as const).map((level) => (
        <button
          key={level}
          type="button"
          className={btn(level === 1 ? flags.h1 : flags.h2)}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          aria-label={`Titre ${level}`}
          aria-pressed={level === 1 ? flags.h1 : flags.h2}
        >
          H{level}
        </button>
      ))}
      <button
        type="button"
        className={btn(flags.link)}
        onClick={() => {
          if (flags.link) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const href = window.prompt("Adresse du lien (https://…)");
          if (href?.trim()) editor.chain().focus().setLink({ href: href.trim() }).run();
        }}
        aria-label={flags.link ? "Retirer le lien" : "Ajouter un lien"}
        aria-pressed={flags.link}
      >
        Lien
      </button>
      <button
        type="button"
        className={btn(flags.highlight)}
        onClick={() =>
          (flags.highlight
            ? editor.chain().focus().unsetHighlight()
            : editor.chain().focus().setHighlight({ color: HIGHLIGHT })
          ).run()
        }
        aria-label="Surlignage"
        aria-pressed={flags.highlight}
      >
        Surl.
      </button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <button
        type="button"
        className={btn(showToolbar)}
        onClick={onToggleToolbar}
        aria-label="Toutes les options de mise en forme"
        aria-pressed={showToolbar}
      >
        Aa
      </button>
    </BubbleMenu>
  );
}
