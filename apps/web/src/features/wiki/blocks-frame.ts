import type { CSSProperties } from "react";

/**
 * Cadrage des blocs atomiques : taille cyclique (XS → XXL), largeur/hauteur
 * manuelles et position libre { x, y } « mi doc, mi canvas ».
 *
 * Persistance : les attributs voyagent dans `contentHtml` (autosave) en
 * **tokens de classe `blk-*`** — `sanitizeWikiHtml` ne laisse passer que
 * `class` sur les nœuds wiki (data-* limités à kind/label/value/size/expr/rows),
 * et `class` est le seul canal commun aux trois tags de blocs. Un bloc sans
 * token reste dans le flux : lecture des contenus existants inchangée.
 */

/** Valeurs de taille du bloc (lues dans les tokens `blk-size-*` ; le contrôle
 * d'édition a été retiré — dimension à la souris, taille héritée conservée). */
export const SIZE_STATES = [
  { value: "xs", label: "XS" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
  { value: "xxl", label: "XXL" },
] as const;

const SIZE_VALUES: ReadonlySet<string> = new Set(SIZE_STATES.map((s) => s.value));

/** Pas de la grille invisible de placement : x en % du conteneur, y en px. */
export const GRID_X = 8;
export const GRID_Y = 32;

export interface BlockFrame {
  /** "" = md (défaut historique sans token). */
  size: string;
  /** Largeur en % du conteneur, bornée par `min(100%, …)` côté vue. */
  w: number | null;
  /** Hauteur minimale en px. */
  h: number | null;
  /** Position libre : x en % / y en px. Les deux = hors flux, sinon flux. */
  x: number | null;
  y: number | null;
}

function toInt(value: unknown, min: number, max: number): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(Math.round(n), min), max);
}

/** Lecture défensive des attributs de cadrage (HTML servi = frontière de confiance). */
export function frameOf(attrs: Record<string, unknown>): BlockFrame {
  const size = typeof attrs.size === "string" && SIZE_VALUES.has(attrs.size) ? attrs.size : "";
  return {
    size,
    w: toInt(attrs.w, 1, 100),
    h: toInt(attrs.h, 0, 10_000),
    x: toInt(attrs.x, 0, 100),
    y: toInt(attrs.y, 0, 50_000),
  };
}

/** Le bloc est sorti du flux (position libre). */
export function isFloating(f: BlockFrame): boolean {
  return f.x !== null && f.y !== null;
}

function classAttr(token: string | null): { class?: string } {
  return token ? { class: token } : {};
}

function sizeToken(size: unknown): string | null {
  return typeof size === "string" && SIZE_VALUES.has(size) ? `blk-size-${size}` : null;
}

function intToken(prefix: string, value: unknown, min: number, max: number): string | null {
  const n = toInt(value, min, max);
  return n === null ? null : `${prefix}${n}`;
}

/**
 * Spec des attributs de cadrage, commun aux trois nœuds de bloc : le rendu
 * émet un token de classe par attribut (`mergeAttributes` les concatène).
 */
export const frameAttrSpecs = {
  size: { default: "", renderHTML: (a: { size?: unknown }) => classAttr(sizeToken(a.size)) },
  w: {
    default: null,
    renderHTML: (a: { w?: unknown }) => classAttr(intToken("blk-w", a.w, 1, 100)),
  },
  h: {
    default: null,
    renderHTML: (a: { h?: unknown }) => classAttr(intToken("blk-h", a.h, 0, 10_000)),
  },
  x: {
    default: null,
    renderHTML: (a: { x?: unknown }) => classAttr(intToken("blk-x", a.x, 0, 100)),
  },
  y: {
    default: null,
    renderHTML: (a: { y?: unknown }) => classAttr(intToken("blk-y", a.y, 0, 50_000)),
  },
};

/**
 * Tokens `blk-*` d'une classe HTML → attributs de cadrage.
 * Absence de token = défaut = flux normal (rétrocompatible).
 */
export function parseFrameTokens(className: string | null | undefined): {
  size?: string;
  w?: number;
  h?: number;
  x?: number;
  y?: number;
} {
  const out: { size?: string; w?: number; h?: number; x?: number; y?: number } = {};
  if (!className) return out;
  for (const token of className.split(/\s+/)) {
    if (token.startsWith("blk-size-")) {
      const size = token.slice("blk-size-".length);
      if (SIZE_VALUES.has(size)) out.size = size;
      continue;
    }
    const n = token.startsWith("blk-w")
      ? toInt(token.slice("blk-w".length), 1, 100)
      : token.startsWith("blk-h")
        ? toInt(token.slice("blk-h".length), 0, 10_000)
        : token.startsWith("blk-x")
          ? toInt(token.slice("blk-x".length), 0, 100)
          : token.startsWith("blk-y")
            ? toInt(token.slice("blk-y".length), 0, 50_000)
            : null;
    if (n === null) continue;
    if (token.startsWith("blk-w")) out.w = n;
    else if (token.startsWith("blk-h")) out.h = n;
    else if (token.startsWith("blk-x")) out.x = n;
    else out.y = n;
  }
  return out;
}

/** Ancienne balise `data-size` (sm/lg) de `aetheris-block` → enum actuelle. */
export function legacySize(dataSize: string | null | undefined): string {
  return dataSize === "sm" ? "s" : dataSize === "lg" ? "l" : "";
}

/**
 * Style inline du cadrage. La largeur passe par `min(100%, …)` : responsive
 * garanti, `max-w-*` interdit (PARRY). Position libre → absolu en % / px.
 */
export function frameStyle(f: BlockFrame): CSSProperties | undefined {
  const style: CSSProperties = {};
  if (f.w !== null) style.width = `min(100%, ${f.w}%)`;
  if (f.h !== null) style.minHeight = `${f.h}px`;
  if (f.x !== null && f.y !== null) {
    style.position = "absolute";
    style.left = `${f.x}%`;
    style.top = `${f.y}px`;
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

/** Snap horizontal : au pas de grille, borné à [0, max]. */
export function snapPct(value: number, max: number): number {
  const snapped = Math.round(value / GRID_X) * GRID_X;
  return Math.min(Math.max(snapped, 0), Math.max(max, 0));
}

/** Snap vertical : au pas de grille, jamais au-dessus du conteneur. */
export function snapPx(value: number): number {
  return Math.max(Math.round(value / GRID_Y) * GRID_Y, 0);
}

/** Bord saisi à la souris pendant un redimensionnement. */
export type ResizeEdge = "l" | "r" | "t" | "b" | "se";

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Redimensionnement à la souris : géométrie pure (le composant ne gère que
 * les events). `start` = rect du bloc au pointerdown, px relatifs au
 * conteneur. Libre — le snap de grille concerne le placement, pas la taille.
 * `l`/`t` ne s'appliquent qu'aux blocs flottants (en flux, pas de bord gauche
 * ou haut à redimensionner).
 */
export function resizeFrame(
  frame: BlockFrame,
  edge: ResizeEdge,
  start: { left: number; top: number; right: number; bottom: number },
  px: number,
  py: number,
  containerW: number,
): Partial<BlockFrame> {
  if (!(containerW > 0)) return {};
  const out: Partial<BlockFrame> = {};
  if (edge === "r" || edge === "se") {
    out.w = clamp(Math.round((clamp(px - start.left, 0, containerW) / containerW) * 100), 4, 100);
  }
  if (edge === "b" || edge === "se") {
    out.h = clamp(Math.round(py - start.top), 16, 10_000);
  }
  if (edge === "l" && frame.x !== null) {
    const rightPct = Math.round((start.right / containerW) * 100);
    const x = clamp(Math.round((px / containerW) * 100), 0, Math.max(rightPct - 4, 0));
    out.x = x;
    out.w = clamp(rightPct - x, 4, 100);
  }
  if (edge === "t" && frame.y !== null) {
    const bottom = Math.round(start.bottom);
    const y = clamp(Math.round(py), 0, Math.max(bottom - 16, 0));
    out.y = y;
    out.h = clamp(bottom - y, 16, 10_000);
  }
  return out;
}

const SIZE_TEXT: Record<string, string> = {
  xs: "text-[0.65rem]",
  s: "text-xs",
  m: "text-sm",
  l: "text-base",
  xl: "text-lg",
  xxl: "text-xl",
};

/** Échelle de texte d'une taille de bloc (appliquée aux champs des vues). */
export function sizeTextCls(size: string): string {
  return SIZE_TEXT[size] ?? "text-sm";
}
