import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { ReactNodeViewRenderer, ReactRenderer } from "@tiptap/react";
import type { NoteBlock } from "@aetheris/shared";
import { frameAttrSpecs, legacySize, parseFrameTokens } from "./blocks-frame";
import { SuggestionList, type SuggestionItem, type SuggestionListRef } from "./suggestion-list";
import { MetaBlockView } from "./meta-block-view";
import { DiceBlockView } from "./dice-block-view";
import { DEFAULT_TABLE_ROWS, TableBlockView } from "./table-block-view";

// ───────────────────── Marque : lien wiki [[…]] ─────────────────────

export const WikiLinkMark = Mark.create({
  name: "wikiLink",
  priority: 1000,
  keepOnSplit: false,

  addAttributes() {
    return { title: { default: "" } };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-wiki-link]",
        getAttrs: (el) => {
          const title =
            typeof el === "string"
              ? el
              : ((el as HTMLElement).getAttribute("data-wiki-link") ?? "");
          return title.length > 0 ? { title } : false;
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

// ───────────────────── Nœud : bloc de métadonnées { label, value } ─────────────────────

export const MetaBlockNode = Node.create({
  name: "metaBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      kind: { default: "custom", renderHTML: (attrs) => ({ "data-kind": attrs.kind }) },
      label: { default: "", renderHTML: (attrs) => ({ "data-label": attrs.label }) },
      value: { default: "", renderHTML: (attrs) => ({ "data-value": attrs.value }) },
      // Cadrage (taille/w/h/x/y) : persisté en tokens de classe `blk-*`.
      ...frameAttrSpecs,
    };
  },

  parseHTML() {
    return [
      {
        tag: "aetheris-block",
        getAttrs: (el) => {
          if (typeof el === "string") return false;
          const frame = parseFrameTokens(el.getAttribute("class"));
          return {
            kind: el.getAttribute("data-kind") || "custom",
            label: el.getAttribute("data-label") ?? "",
            value: el.getAttribute("data-value") ?? "",
            ...frame,
            // Anciens contenus : data-size="sm|lg" lisible en l'absence de token.
            size: frame.size ?? legacySize(el.getAttribute("data-size")),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aetheris-block", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MetaBlockView);
  },
});

// ───────────────────── Nœud : jet de dés (bloc Amsel) ─────────────────────

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
      ...frameAttrSpecs,
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
            ...parseFrameTokens(el.getAttribute("class")),
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

// ───────────────────── Nœud : table de données (bloc Amsel) ─────────────────────

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
      ...frameAttrSpecs,
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
            ...parseFrameTokens(el.getAttribute("class")),
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

/** Libellés pré-remplis par univers (simple presets : pas de sous-typage dans le schema).
 *  Exportés : source des « favoris » de la Bibliothèque de blocs. */
export const BLOCK_PRESETS: {
  pack: string;
  items: { title: string; kind: NoteBlock["kind"]; label: string }[];
}[] = [
  {
    pack: "générique",
    items: [
      { title: "Date", kind: "date", label: "Date" },
      { title: "Événement", kind: "event", label: "Événement" },
      { title: "Description", kind: "description", label: "Description" },
      { title: "Catégorie", kind: "category", label: "Catégorie" },
      { title: "Personnalisé", kind: "custom", label: "Personnalisé" },
      { title: "Texte", kind: "custom", label: "Texte" },
      { title: "Histoire", kind: "description", label: "Histoire" },
      { title: "Macro", kind: "macro", label: "Macro" },
    ],
  },
  {
    pack: "SF",
    items: [
      { title: "Ère", kind: "custom", label: "Ère" },
      { title: "Colonie", kind: "category", label: "Colonie" },
      { title: "Navire", kind: "custom", label: "Navire" },
    ],
  },
  {
    pack: "Médiéval fantasy",
    items: [
      { title: "Ère", kind: "custom", label: "Ère" },
      { title: "Royaume", kind: "category", label: "Royaume" },
      { title: "Quête", kind: "event", label: "Quête" },
    ],
  },
  {
    pack: "Horreur",
    items: [
      { title: "Menace", kind: "event", label: "Menace" },
      { title: "Sanction", kind: "custom", label: "Sanction" },
      { title: "Witness", kind: "description", label: "Witness" },
    ],
  },
];

/** Presets visibles en drag & drop (palette + Bibliothèque) : pack générique seul —
 *  les packs d'extension (SF/Horreur/Médiéval) restent au menu slash. */
export const DND_PRESETS = BLOCK_PRESETS.filter((p) => p.pack === "générique");

/** Insertion d'un bloc : la variante MJ le place dans un <gm-secret> (existant
 *  ou créé au besoin) — stripGmSecrets() retire alors toute la zone côté joueurs. */
function insertMetaBlock(preset: { kind: NoteBlock["kind"]; label: string }, gm: boolean) {
  return ({ editor, range }: { editor: Editor; range: Range }) => {
    // Profondeur lue AVANT deleteRange (la chaîne ne s'exécute qu'à run()).
    const { $from } = editor.state.selection;
    let insideSecret = false;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === "gmSecret") {
        insideSecret = true;
        break;
      }
    }
    const block = {
      type: "metaBlock",
      attrs: { kind: preset.kind, label: preset.label, value: "" },
    };
    const chain = editor.chain().focus().deleteRange(range);
    if (gm && !insideSecret) {
      chain.insertContent({ type: "gmSecret", content: [block, { type: "paragraph" }] });
    } else {
      chain.insertContent(block);
    }
    chain.run();
  };
}

/** Liste des entrées du menu slash (pures : testables sans éditeur). */
export function slashItems(isGM: boolean): SlashItem[] {
  return [
    {
      kind: "slash",
      title: "Titre 1",
      hint: "h1",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
    },
    {
      kind: "slash",
      title: "Titre 2",
      hint: "h2",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
    },
    {
      kind: "slash",
      title: "Titre 3",
      hint: "h3",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
    },
    {
      kind: "slash",
      title: "Texte",
      hint: "paragraphe",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setParagraph().run(),
    },
    {
      kind: "slash",
      title: "Liste à puces",
      hint: "•",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      kind: "slash",
      title: "Liste numérotée",
      hint: "1.",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      kind: "slash",
      title: "Citation",
      hint: ">",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      kind: "slash",
      title: "Filet horizontal",
      hint: "---",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      kind: "slash",
      title: "Jet de dés",
      hint: "bloc · 1d20",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertContent({ type: "diceBlock" }).run(),
    },
    {
      kind: "slash",
      title: "Tableau de données",
      hint: "bloc · tableau",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertContent({ type: "tableBlock" }).run(),
    },
    ...(isGM
      ? [
          {
            kind: "slash" as const,
            title: "Bloc secret MJ",
            hint: "visible uniquement par les MJ",
            command: ({ editor, range }: { editor: Editor; range: Range }) =>
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent({
                  type: "gmSecret",
                  content: [{ type: "paragraph" }],
                })
                .run(),
          },
        ]
      : []),
    ...BLOCK_PRESETS.flatMap(({ pack, items }) =>
      items.flatMap((b) => {
        const entries: SlashItem[] = [
          {
            kind: "slash",
            title: b.title,
            hint: `bloc · ${pack}`,
            command: insertMetaBlock(b, false),
          },
        ];
        if (isGM) {
          entries.push({
            kind: "slash",
            title: `${b.title} (MJ seulement)`,
            hint: `bloc MJ · ${pack}`,
            command: insertMetaBlock(b, true),
          });
        }
        return entries;
      }),
    ),
  ];
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
            marks: [{ type: WikiLinkMark.name, attrs: { title: item.title } }],
          },
          { type: "text", text: " ", marks: [] },
        ])
        .run();
    },
  });
}
