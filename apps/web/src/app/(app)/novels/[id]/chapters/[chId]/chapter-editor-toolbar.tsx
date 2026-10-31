"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { ColorPicker } from "./chapter-editor-color-picker";

/** Couleur du surlignage (inline : `.novel-prose` n'a pas de style `mark`). */
export const HIGHLIGHT = "#fde68a";

/* Familles groupées : les 4 premières lisent les variables CSS du projet
   (polices next/font déjà embarquées — aucune dépendance ajoutée), le reste
   sont des stacks système libres de droits. */
const FAMILIES = [
  {
    label: "Projet",
    options: [
      { value: "var(--aetheris-font-display)", label: "Cinzel (titres)" },
      { value: "var(--aetheris-font-lore), Georgia, serif", label: "Newsreader (lore)" },
      { value: "var(--aetheris-font-ui)", label: "Jakarta (UI)" },
      { value: "var(--aetheris-font-mono), monospace", label: "Geist Mono" },
    ],
  },
  {
    label: "Serif",
    options: [
      { value: "Georgia, serif", label: "Georgia" },
      { value: '"Times New Roman", serif', label: "Times New Roman" },
      { value: "Garamond, serif", label: "Garamond" },
      { value: '"Palatino Linotype", Palatino, serif', label: "Palatino" },
      { value: '"Book Antiqua", Palatino, serif', label: "Book Antiqua" },
    ],
  },
  {
    label: "Sans",
    options: [
      { value: "Verdana, sans-serif", label: "Verdana" },
      { value: '"Trebuchet MS", sans-serif', label: "Trebuchet MS" },
      { value: "system-ui, sans-serif", label: "System UI" },
    ],
  },
  {
    label: "Mono",
    options: [
      { value: '"Courier New", monospace', label: "Courier New" },
      { value: "Consolas, monospace", label: "Consolas" },
    ],
  },
] as const;

const FAMILY_VALUES: readonly string[] = FAMILIES.flatMap((g) => g.options.map((o) => o.value));

type AlignMode = "left" | "center" | "right" | "justify";

const ALIGN_LABELS: Record<AlignMode, string> = {
  left: "gauche",
  center: "centre",
  right: "droite",
  justify: "justifié",
};

/* Échelle typographique éditoriale : légende (12) → texte → intertitres →
   display (48). */
const SIZES = [
  { value: "", label: "Taille" },
  { value: "12px", label: "12" },
  { value: "14px", label: "14" },
  { value: "16px", label: "16" },
  { value: "18px", label: "18" },
  { value: "20px", label: "20" },
  { value: "24px", label: "24" },
  { value: "28px", label: "28" },
  { value: "32px", label: "32" },
  { value: "40px", label: "40" },
  { value: "48px", label: "48" },
] as const;

type ToolbarFlags = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  highlight: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  bullet: boolean;
  ordered: boolean;
  quote: boolean;
  code: boolean;
  link: boolean;
  table: boolean;
  align: string | null;
  color: string;
  highlightColor: string;
  family: string;
  size: string;
  canUndo: boolean;
  canRedo: boolean;
} | null;

function Divider() {
  return <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />;
}

/** Quatre lignes dont l'alignement change selon la variante. */
function IconAlign({ mode }: { mode: AlignMode }) {
  const widths: readonly number[] =
    mode === "center" ? [10, 6, 10] : mode === "justify" ? [10, 10, 10] : [10, 7, 10];
  const x = (i: number) => {
    const w = widths[i] ?? 10;
    if (mode === "right") return 13 - w;
    if (mode === "center") return 8 - w / 2;
    return 3;
  };
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      {[4, 8, 12].map((y, i) => (
        <rect key={y} x={x(i)} y={y - 0.75} width={widths[i] ?? 10} height={1.5} />
      ))}
    </svg>
  );
}

function IconList({ ordered }: { ordered?: boolean }) {
  const digits = ["1", "2", "3"];
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      {[4, 8, 12].map((y, i) => (
        <g key={y}>
          {ordered ? (
            <text x="2" y={y + 1.8} fontSize="5" fontFamily="monospace">
              {digits[i]}
            </text>
          ) : (
            <circle cx="4" cy={y} r="1.3" />
          )}
          <rect x="7" y={y - 0.75} width="6" height="1.5" />
        </g>
      ))}
    </svg>
  );
}

function IconCode() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M6 5L2.5 8 6 11M10 5l3.5 3L10 11" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
    >
      <path d="M6.5 9.5l3-3" />
      <path d="M8.6 5.4L10 4a2.4 2.4 0 013.4 3.4l-1.4 1.4" />
      <path d="M7.4 10.6L6 12a2.4 2.4 0 01-3.4-3.4L4 7.2" />
    </svg>
  );
}

function IconRule() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M2 8h12" />
    </svg>
  );
}

function IconUndo({ mirrored }: { mirrored?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <g transform={mirrored ? "translate(16 0) scale(-1 1)" : undefined}>
        <path d="M6 4L3 7l3 3" />
        <path d="M3 7h5.5a3.5 3.5 0 010 7H7.5" />
      </g>
    </svg>
  );
}

/**
 * Barre d'outils de l'éditeur : centrée dans la colonne d'édition (sticky
 * bottom côté ChapterEditor), groupes séparés par des filets, zéro glyphe
 * unicode (SVG maison + libellés ASCII).
 */
export function ChapterEditorToolbar({ editor }: { editor: Editor | null }) {
  // Re-rendu à chaque transaction : les états actifs et les sélecteurs
  // (police/taille/couleur) restent fidèles à la sélection courante.
  const flags: ToolbarFlags = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return null;
      const textStyle = ed.getAttributes("textStyle");
      const highlight = ed.getAttributes("highlight");
      return {
        bold: ed.isActive("bold"),
        italic: ed.isActive("italic"),
        underline: ed.isActive("underline"),
        strike: ed.isActive("strike"),
        highlight: ed.isActive("highlight"),
        h1: ed.isActive("heading", { level: 1 }),
        h2: ed.isActive("heading", { level: 2 }),
        h3: ed.isActive("heading", { level: 3 }),
        bullet: ed.isActive("bulletList"),
        ordered: ed.isActive("orderedList"),
        quote: ed.isActive("blockquote"),
        code: ed.isActive("codeBlock"),
        link: ed.isActive("link"),
        table: ed.isActive("table"),
        // `textAlign` est un attribut global : `isActive("textAlign", …)` ne
        // matche aucun nœud/mark du schéma et renvoie toujours false. On lit
        // tous les blocs sélectionnés : Ctrl+A (AllSelection) a `$from.parent`
        // = doc, d'où « gauche » actif alors que le texte est justifié.
        align: (() => {
          const read = (node: { attrs: Record<string, unknown> }) =>
            (node.attrs.textAlign as string | undefined) ?? "left";
          const { selection } = ed.state;
          if (selection.empty) return read(selection.$from.parent);
          const modes = new Set<string>();
          ed.state.doc.nodesBetween(selection.from, selection.to, (node) => {
            if (node.isTextblock) modes.add(read(node));
          });
          // Sélection hétérogène : aucun mode n'est « actif ».
          return modes.size === 1 ? [...modes][0]! : null;
        })(),
        color: typeof textStyle.color === "string" ? textStyle.color : "",
        highlightColor: typeof highlight.color === "string" ? highlight.color : "",
        family: typeof textStyle.fontFamily === "string" ? textStyle.fontFamily : "",
        size: typeof textStyle.fontSize === "string" ? textStyle.fontSize : "",
        canUndo: ed.can().undo(),
        canRedo: ed.can().redo(),
      };
    },
  });

  if (!editor || !flags) return <span className="hidden sm:block" />;

  const btn = (active: boolean) =>
    `px-2 py-1 text-xs leading-none transition ${
      active
        ? "border border-accent bg-accent/15 text-accent"
        : "border border-transparent text-muted hover:text-foreground"
    }`;
  const selectCls = "input input-sm cursor-pointer border-y-0 border-r-0";

  return (
    <div
      className="flex w-full flex-wrap items-center justify-center gap-1"
      role="toolbar"
      aria-label="Mise en forme"
      // Garde le focus/sélection dans l'éditeur quand on clique un bouton
      // (sinon la sélection est perdue et les clics suivants sans effet).
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("select, input")) return;
        e.preventDefault();
      }}
    >
      {/* Police + taille */}
      <span className="flex items-center gap-1">
        <select
          value={FAMILY_VALUES.includes(flags.family) ? flags.family : ""}
          onChange={(e) => {
            const v = e.target.value;
            const chain = editor.chain().focus();
            (v ? chain.setFontFamily(v) : chain.unsetFontFamily()).run();
          }}
          aria-label="Police"
          title="Police"
          className={selectCls}
          style={{ width: "auto", padding: "0.25rem 1.4rem 0.25rem 0.5rem" }}
        >
          <option value="" hidden>
            Police
          </option>
          {FAMILIES.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          value={SIZES.some((s) => s.value === flags.size) ? flags.size : ""}
          onChange={(e) => {
            const v = e.target.value;
            const chain = editor.chain().focus();
            (v ? chain.setFontSize(v) : chain.unsetFontSize()).run();
          }}
          aria-label="Taille de texte"
          title="Taille de texte"
          className={selectCls}
          style={{ width: "auto", padding: "0.25rem 1.4rem 0.25rem 0.5rem" }}
        >
          {SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </span>

      <Divider />

      {/* Gras / italique / souligné / barre */}
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          className={btn(flags.bold)}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Gras (Ctrl+B)"
          aria-label="Gras"
          aria-pressed={flags.bold}
        >
          <span className="font-bold" aria-hidden>
            B
          </span>
        </button>
        <button
          type="button"
          className={btn(flags.italic)}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italique (Ctrl+I)"
          aria-label="Italique"
          aria-pressed={flags.italic}
        >
          <span className="italic" aria-hidden>
            I
          </span>
        </button>
        <button
          type="button"
          className={btn(flags.underline)}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Souligné (Ctrl+U)"
          aria-label="Souligné"
          aria-pressed={flags.underline}
        >
          <span className="underline" aria-hidden>
            U
          </span>
        </button>
        <button
          type="button"
          className={btn(flags.strike)}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Barré"
          aria-label="Barré"
          aria-pressed={flags.strike}
        >
          <span className="line-through" aria-hidden>
            S
          </span>
        </button>
      </span>

      <Divider />

      {/* Surlignage + couleur du texte : palettes custom (voir
          chapter-editor-color-picker) — le natif type=color reste caché
          derrière la pastille « Personnalisé ». */}
      <span className="flex items-center gap-1">
        <ColorPicker
          label="Surlignage"
          value={flags.highlight ? flags.highlightColor || HIGHLIGHT : ""}
          fallback={HIGHLIGHT}
          active={flags.highlight}
          title={
            flags.highlight ? "Surlignage actif — choisir la couleur" : "Surligner (Ctrl+Maj+H)"
          }
          onPick={(hex) => {
            const chain = editor.chain().focus();
            // Re-clic sur la couleur déjà appliquée = retirer le surlignage.
            (flags.highlight && (flags.highlightColor || HIGHLIGHT) === hex
              ? chain.unsetHighlight()
              : chain.setHighlight({ color: hex })
            ).run();
          }}
        />
        <ColorPicker
          label="Couleur du texte"
          value={flags.color}
          fallback="#e8e6e3"
          active={flags.color !== ""}
          title="Couleur du texte"
          onPick={(hex) => editor.chain().focus().setColor(hex).run()}
        />
        <button
          type="button"
          className={btn(false)}
          onClick={() => editor.chain().focus().unsetColor().run()}
          title="Couleur du texte par défaut"
          aria-label="Couleur du texte par défaut"
        >
          <span aria-hidden className="font-bold underline decoration-1">
            A
          </span>
        </button>
      </span>

      <Divider />

      {/* Alignement */}
      <span className="flex items-center gap-0.5">
        {(Object.keys(ALIGN_LABELS) as AlignMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={btn(flags.align === mode)}
            onClick={() => editor.chain().focus().setTextAlign(mode).run()}
            title={`Alignement : ${ALIGN_LABELS[mode]}`}
            aria-label={`Aligner à ${ALIGN_LABELS[mode]}`}
            aria-pressed={flags.align === mode}
          >
            <IconAlign mode={mode} />
          </button>
        ))}
      </span>

      <Divider />

      {/* Titres */}
      <span className="flex items-center gap-0.5">
        {([1, 2, 3] as const).map((level) => (
          <button
            key={level}
            type="button"
            className={btn(flags[`h${level}` as "h1" | "h2" | "h3"])}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            title={`Titre ${level}`}
            aria-label={`Titre ${level}`}
            aria-pressed={flags[`h${level}` as "h1" | "h2" | "h3"]}
          >
            H{level}
          </button>
        ))}
      </span>

      <Divider />

      {/* Listes, citation, code */}
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          className={btn(flags.bullet)}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Liste à puces"
          aria-label="Liste à puces"
          aria-pressed={flags.bullet}
        >
          <IconList />
        </button>
        <button
          type="button"
          className={btn(flags.ordered)}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Liste numérotée"
          aria-label="Liste numérotée"
          aria-pressed={flags.ordered}
        >
          <IconList ordered />
        </button>
        <button
          type="button"
          className={btn(flags.quote)}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citation"
          aria-label="Citation"
          aria-pressed={flags.quote}
        >
          <span className="text-[0.95rem] leading-none" aria-hidden>
            &quot;
          </span>
        </button>
        <button
          type="button"
          className={btn(flags.code)}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Bloc de code"
          aria-label="Bloc de code"
          aria-pressed={flags.code}
        >
          <IconCode />
        </button>
      </span>

      <Divider />

      {/* Lien + filet horizontal */}
      <span className="flex items-center gap-0.5">
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
          title={flags.link ? "Retirer le lien" : "Ajouter un lien"}
          aria-label={flags.link ? "Retirer le lien" : "Ajouter un lien"}
          aria-pressed={flags.link}
        >
          <IconLink />
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Filet horizontal"
          aria-label="Filet horizontal"
        >
          <IconRule />
        </button>
      </span>

      <Divider />

      {/* Tableaux */}
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          className={btn(flags.table)}
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Insérer un tableau (3×3)"
          aria-label="Insérer un tableau"
        >
          <span className="text-xs" aria-hidden>
            Tableau
          </span>
        </button>
        {flags.table && (
          <>
            <button
              type="button"
              className={btn(false)}
              onClick={() => editor.chain().focus().addRowBefore().run()}
              title="Ajouter une ligne au-dessus"
              aria-label="Ajouter une ligne"
            >
              +L
            </button>
            <button
              type="button"
              className={btn(false)}
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Supprimer la ligne"
              aria-label="Supprimer la ligne"
            >
              -L
            </button>
            <button
              type="button"
              className={btn(false)}
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              title="Ajouter une colonne à gauche"
              aria-label="Ajouter une colonne"
            >
              +C
            </button>
            <button
              type="button"
              className={btn(false)}
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Supprimer la colonne"
              aria-label="Supprimer la colonne"
            >
              -C
            </button>
            <button
              type="button"
              className={btn(false)}
              onClick={() => editor.chain().focus().mergeOrSplit().run()}
              title="Fusionner ou diviser la cellule"
              aria-label="Fusionner ou diviser la cellule"
            >
              Cell
            </button>
            <button
              type="button"
              className={btn(false)}
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Supprimer le tableau"
              aria-label="Supprimer le tableau"
            >
              Suppr
            </button>
          </>
        )}
      </span>

      <Divider />

      {/* Annuler / refaire */}
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          className={`${btn(false)} disabled:opacity-40`}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!flags.canUndo}
          title="Annuler (Ctrl+Z)"
          aria-label="Annuler"
        >
          <IconUndo />
        </button>
        <button
          type="button"
          className={`${btn(false)} disabled:opacity-40`}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!flags.canRedo}
          title="Rétablir (Ctrl+Maj+Z)"
          aria-label="Rétablir"
        >
          <IconUndo mirrored />
        </button>
      </span>
    </div>
  );
}
