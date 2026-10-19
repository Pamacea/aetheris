"use client";

import type { Editor } from "@tiptap/react";

export function ChapterEditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return <span className="hidden sm:block" />;
  const btn = (active: boolean) =>
    `px-2 py-1 text-xs transition ${
      active ? "border border-accent bg-accent/15 text-accent" : "text-muted hover:text-foreground"
    }`;

  return (
    <div
      className="hidden shrink-0 items-center gap-0.5 border border-border px-1 py-0.5 md:flex"
      role="toolbar"
      aria-label="Mise en forme"
    >
      <button
        type="button"
        className={btn(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Gras (Ctrl+B)"
        aria-label="Gras"
        aria-pressed={editor.isActive("bold")}
      >
        <b>B</b>
      </button>
      <button
        type="button"
        className={btn(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italique (Ctrl+I)"
        aria-label="Italique"
        aria-pressed={editor.isActive("italic")}
      >
        <i>I</i>
      </button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <button
        type="button"
        className={btn(editor.isActive("heading", { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Titre 1 (Ctrl+Alt+1)"
        aria-label="Titre 1"
        aria-pressed={editor.isActive("heading", { level: 1 })}
      >
        H1
      </button>
      <button
        type="button"
        className={btn(editor.isActive("heading", { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Titre 2 (Ctrl+Alt+2)"
        aria-label="Titre 2"
        aria-pressed={editor.isActive("heading", { level: 2 })}
      >
        H2
      </button>
      <button
        type="button"
        className={btn(editor.isActive("heading", { level: 3 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Titre 3 (Ctrl+Alt+3)"
        aria-label="Titre 3"
        aria-pressed={editor.isActive("heading", { level: 3 })}
      >
        H3
      </button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <button
        type="button"
        className={btn(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Liste à puces (Ctrl+Shift+8)"
        aria-label="Liste à puces"
        aria-pressed={editor.isActive("bulletList")}
      >
        •—
      </button>
      <button
        type="button"
        className={btn(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Liste numérotée (Ctrl+Shift+7)"
        aria-label="Liste numérotée"
        aria-pressed={editor.isActive("orderedList")}
      >
        1.
      </button>
      <button
        type="button"
        className={btn(editor.isActive("blockquote"))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Citation"
        aria-label="Citation"
        aria-pressed={editor.isActive("blockquote")}
      >
        ❝
      </button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <button
        type="button"
        className={btn(false)}
        onClick={() => editor.chain().focus().undo().run()}
        title="Annuler (Ctrl+Z)"
        aria-label="Annuler"
      >
        ↺
      </button>
      <button
        type="button"
        className={btn(false)}
        onClick={() => editor.chain().focus().redo().run()}
        title="Rétablir (Ctrl+Maj+Z)"
        aria-label="Rétablir"
      >
        ↻
      </button>
    </div>
  );
}
