import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { ReactNodeViewRenderer, ReactRenderer } from "@tiptap/react";
import { BLOCK_DEFS, blockContentOf, type BlockDef } from "./block-defs";
import { SuggestionList, type SuggestionItem, type SuggestionListRef } from "./suggestion-list";
import { DiceBlockView } from "./dice-block-view";
import { DEFAULT_TABLE_ROWS, TableBlockView } from "./table-block-view";

// ───────────────────── Marque : lien wiki [[…]] ─────────────────────

export const WikiLinkMark = Mark.create({
  name: "wikiLink",
  priority: 1000,
  keepOnSplit: false,

  addAttributes() {
    return {
      title: { default: "" },
      // Lien stable : l'id survit au renommage de la cible. Les liens
      // antérieurs n'en ont pas — le titre sert alors de repli.
      id: {
        default: "",
        renderHTML: (attrs) => (attrs.id ? { "data-wiki-link-id": attrs.id } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-wiki-link]",
        getAttrs: (el) => {
          if (typeof el === "string") return false;
          const title = el.getAttribute("data-wiki-link") ?? "";
          if (title.length === 0) return false;
          return { title, id: el.getAttribute("data-wiki-link-id") ?? "" };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, mark }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        class: "wiki-link",
        href: "#",
        "data-wiki-link": mark.attrs.title as string,
      }),
      0,
    ];
  },
});

// ───────────────────── Nœud : bloc secret MJ ─────────────────────

export const GmSecretNode = Node.create({
  name: "gmSecret",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "gm-secret" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["gm-secret", mergeAttributes(HTMLAttributes), 0];
  },
});

// ───────────────────── Nœud : jet de dés ─────────────────────

export const DiceBlockNode = Node.create({
  name: "diceBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      label: {
        default: "Jet",
        renderHTML: (attrs) => ({ "data-label": attrs.label }),
      },
      expr: {
        default: "1d20",
        renderHTML: (attrs) => ({ "data-expr": attrs.expr }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "dice-block",
        getAttrs: (el) => {
          if (typeof el === "string") return false;
          return {
            label: el.getAttribute("data-label") || "Jet",
            expr: el.getAttribute("data-expr") || "1d20",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["dice-block", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiceBlockView);
  },
});

// ───────────────────── Nœud : tableau de stats ─────────────────────

export const TableBlockNode = Node.create({
  name: "tableBlock",
  group: "block",
  atom: true,

  addAttributes() {
    // Matrice JSON dans `data-rows` (structure plate, reproductible à l'identique
    // après parse : les enfants DOM du bloc ne sont jamais source de vérité).
    return {
      rows: {
        default: JSON.stringify(DEFAULT_TABLE_ROWS),
        renderHTML: (attrs) => ({ "data-rows": attrs.rows }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "wiki-table",
        getAttrs: (el) => {
          if (typeof el === "string") return false;
          return {
            rows: el.getAttribute("data-rows") || JSON.stringify(DEFAULT_TABLE_ROWS),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["wiki-table", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableBlockView);
  },
});

// ───────────────────── Suggestions (slash + [[) ─────────────────────

interface SuggestionRendererConfig<T extends SuggestionItem> {
  char: string;
  items: (props: { query: string }) => T[];
  command: (props: { editor: Editor; range: Range; item: T }) => void;
}

function createSuggestionExtension<T extends SuggestionItem>(
  name: string,
  config: SuggestionRendererConfig<T>,
): Extension {
  return Extension.create({
    name,
    addProseMirrorPlugins() {
      return [
        Suggestion<T, T>({
          editor: this.editor,
          // Key unique par suggestion : deux Suggestion partageant la key
          // par défaut déclenchent "Adding different instances of a keyed plugin".
          pluginKey: new PluginKey(name),
          char: config.char,
          allowSpaces: true,
          items: ({ query }) => config.items({ query }),
          command: ({ editor, range, props }) => config.command({ editor, range, item: props }),
          render: () => {
            let component: ReactRenderer<SuggestionListRef> | undefined;
            let unmount: (() => void) | undefined;
            const listProps = (props: SuggestionProps<T, T>) => ({
              items: props.items,
              command: props.command as (item: SuggestionItem) => void,
            });
            return {
              onStart(props: SuggestionProps<T, T>) {
                component = new ReactRenderer(SuggestionList, {
                  props: listProps(props),
                  editor: props.editor,
                });
                unmount = props.mount(component.element);
              },
              onUpdate(props: SuggestionProps<T, T>) {
                component?.updateProps(listProps(props));
              },
              onKeyDown(props: SuggestionKeyDownProps) {
                if (props.event.key === "Escape") return false;
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit() {
                unmount?.();
                component?.destroy();
              },
            };
          },
        }),
      ];
    },
  });
}

interface SlashItem extends SuggestionItem {
  kind: "slash";
}

/** Commande slash d'une définition : formatage courant ou insertion du bloc. */
function slashCommand(def: BlockDef) {
  return ({ editor, range }: { editor: Editor; range: Range }) => {
    const p = def.payload;
    if (p.type === "heading") {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: p.level ?? 1 })
        .run();
      return;
    }
    if (p.type === "paragraph") {
      editor.chain().focus().deleteRange(range).setParagraph().run();
      return;
    }
    if (p.type === "blockquote") {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      return;
    }
    if (p.type === "bulletList") {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
      return;
    }
    // Contenu calculé avant deleteRange (la chaîne ne s'exécute qu'à run()).
    editor.chain().focus().deleteRange(range).insertContent(blockContentOf(p)).run();
  };
}

function defToSlashItem(def: BlockDef): SlashItem {
  return {
    kind: "slash",
    title: def.label,
    hint: def.hint ?? def.description,
    command: slashCommand(def),
  };
}

/** Liste des entrées du menu slash (pures : testables sans éditeur). */
export function slashItems(isGM: boolean): SlashItem[] {
  return BLOCK_DEFS.filter((d) => d.category !== "gm" || isGM).map(defToSlashItem);
}

/** Filtrage insensible à la casse du menu slash (title + hint). */
export function filterSlashItems(items: SlashItem[], query: string): SlashItem[] {
  const q = query.toLocaleLowerCase("fr");
  return items.filter(
    (i) =>
      i.title.toLocaleLowerCase("fr").includes(q) || i.hint?.toLocaleLowerCase("fr").includes(q),
  );
}

export function createSlashExtension(opts: { isGM: boolean }): Extension {
  const all = slashItems(opts.isGM);
  return createSuggestionExtension<SlashItem>("slashSuggestion", {
    char: "/",
    items: ({ query }) => filterSlashItems(all, query),
    command: ({ editor, range, item }) => item.command?.({ editor, range }),
  });
}

// ───────────────────── Autocomplete [[…]] ─────────────────────

interface WikiLinkItem extends SuggestionItem {
  kind: "wikilink";
  isNew: boolean;
  /** Entité cible (absent pour une création à la volée). */
  id?: string;
}

/** Candidats de l'autocomplete [[…]] (purs : testables sans éditeur).
 *  max 8 résultats ; `isNew` signale une création de note à partir de la saisie. */
export function wikiLinkItems(
  notes: { id: string; title: string }[],
  query: string,
): WikiLinkItem[] {
  const q = query.toLocaleLowerCase("fr").trim();
  const matches = notes
    .filter((n) => n.title.toLocaleLowerCase("fr").includes(q))
    .slice(0, 8)
    .map<WikiLinkItem>((n) => ({
      kind: "wikilink",
      title: n.title,
      isNew: false,
      id: n.id,
    }));
  if (q.length > 0 && !matches.some((m) => m.title.toLocaleLowerCase("fr") === q)) {
    matches.push({
      kind: "wikilink",
      title: query.trim(),
      isNew: true,
    });
  }
  return matches;
}

export function createWikiLinkExtension(
  notes: {
    id: string;
    title: string;
  }[],
): Extension {
  return createSuggestionExtension<WikiLinkItem>("wikiLinkSuggestion", {
    char: "[[",
    items: ({ query }) => wikiLinkItems(notes, query),
    command: ({ editor, range, item }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent([
          {
            type: "text",
            text: item.title,
            marks: [{ type: WikiLinkMark.name, attrs: { title: item.title, id: item.id ?? "" } }],
          },
          { type: "text", text: " ", marks: [] },
        ])
        .run();
    },
  });
}
