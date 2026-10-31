"use client";

import type { Editor } from "@tiptap/react";
import { FloatingMenu } from "@tiptap/react/menus";

const ITEMS: { label: string; run: (editor: Editor) => void }[] = [
  { label: "Titre 1", run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Titre 2", run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Citation", run: (e) => e.chain().focus().toggleBlockquote().run() },
  {
    label: "Tableau",
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
];

/** Menu « / » minimal (Titre 1/2, Citation, Tableau) ancré sur la sélection. */
export function EditorSlashMenu({ editor }: { editor: Editor }) {
  const apply = (run: (editor: Editor) => void) => {
    // Le paragraphe ne contient que « / » : on supprime le déclencheur puis on agit.
    const { $from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).run();
    run(editor);
  };

  return (
    <FloatingMenu
      editor={editor}
      options={{ placement: "bottom-start", offset: 6 }}
      shouldShow={({ state }) => {
        const { $from, empty } = state.selection;
        return (
          empty &&
          $from.parent.type.name === "paragraph" &&
          $from.parent.textBetween(0, $from.parentOffset) === "/"
        );
      }}
      className="flex flex-col border border-border bg-background/95 py-1 shadow-[0_6px_24px_rgba(0,0,0,0.45)] backdrop-blur"
      aria-label="Commandes rapides"
    >
      {ITEMS.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => apply(item.run)}
          className="px-3 py-1.5 text-left text-xs text-muted hover:bg-card-hover hover:text-foreground"
        >
          {item.label}
        </button>
      ))}
    </FloatingMenu>
  );
}
