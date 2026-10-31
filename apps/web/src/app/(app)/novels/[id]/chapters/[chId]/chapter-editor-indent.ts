import { Extension, type Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

/** 4 espaces insécables : l'indentation survit à la sauvegarde (HTML/JSON). */
const INDENT = "\u00A0\u00A0\u00A0\u00A0";
const LEADING = /^\u00A0{0,4}/;

type Block = { pos: number; leading: number };

const leadingCount = (text: string) => LEADING.exec(text)?.[0].length ?? 0;

function isIndentable(name: string) {
  return name === "paragraph" || name === "heading";
}

/** Paragraphes/titres touchés par la sélection (ou le bloc du curseur). */
function selectedBlocks(editor: Editor): Block[] {
  const { doc, selection } = editor.state;
  if (selection.empty) {
    const { $from } = selection;
    return $from.parent.isTextblock && isIndentable($from.parent.type.name)
      ? [{ pos: $from.before(), leading: leadingCount($from.parent.textContent) }]
      : [];
  }
  const blocks: Block[] = [];
  doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (!node.isTextblock || !isIndentable(node.type.name)) return;
    blocks.push({ pos, leading: leadingCount(node.textContent) });
  });
  return blocks;
}

function changeIndent(editor: Editor, outdent: boolean) {
  const blocks = selectedBlocks(editor);
  if (blocks.length === 0) return false;
  const { selection } = editor.state;
  const { tr } = editor.state;
  // Fin → début : les positions des blocs précédents restent valides.
  for (const { pos, leading } of blocks.reverse()) {
    if (outdent) {
      if (leading > 0) tr.delete(pos + 1, pos + 1 + leading);
    } else {
      tr.insertText(INDENT, pos + 1);
    }
  }
  if (!tr.docChanged) return false;
  // Conserve la sélection multi-blocs (sinon le dispatch la réduit au curseur).
  if (!selection.empty) {
    tr.setSelection(
      TextSelection.between(
        tr.doc.resolve(tr.mapping.map(selection.from, -1)),
        tr.doc.resolve(tr.mapping.map(selection.to, 1)),
      ),
    );
  }
  editor.view.dispatch(tr);
  return true;
}

/** Tab / Shift+Tab : indente le début des blocs (listes : natif Tiptap). */
export const ChapterIndent = Extension.create({
  name: "chapterIndent",
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive("listItem")) return false;
        return changeIndent(this.editor, false);
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) return false;
        return changeIndent(this.editor, true);
      },
    };
  },
});
