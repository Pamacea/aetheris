import { z } from "zod";
import { DiceError, parseRollExpression } from "../dice.js";
import { noteBlocksSchema } from "./wiki.js";

/**
 * Templates de fiches (Phase 4).
 *
 * Inspiré d'Amsel Suite (Lore) mais amélioré :
 * - catégories explicites (ex. « Encyclopédie » → template « Personnages ») ;
 * - champs « formule » (calculs) — absent d'Amsel ;
 * - tags liés aux notes du wiki (backlinks/graphe) ;
 * - export/import JSON (structure seule, comme LoreKit).
 *
 * Un champ est identifié par `id` (clé stable dans `Entity.data`).
 */

const fieldIdSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_-]{0,63}$/,
    "Identifiant : minuscules, chiffres, - ou _, commence par une lettre.",
  );

const fieldLabelSchema = z
  .string()
  .trim()
  .min(1, "Libellé requis.")
  .max(80, "Libellé trop long (80 caractères max).");

/** Largeur sur la grille 12 colonnes de la fiche (sm/md conservés : legacy). */
export const fieldWidthSchema = z.enum(["sm", "md", "full", "1/4", "1/3", "1/2", "3/4"]);
export type FieldWidth = z.infer<typeof fieldWidthSchema>;

/** Grille du canvas d'édition : 12 colonnes, lignes de 16 px, gouttière de 8 px. */
export const GRID_COLS = 12;
export const GRID_ROW_PX = 16;
export const GRID_GAP_PX = 8;

/**
 * Taille max d'un champ image : data URL d'un fichier ≤ 1,2 Mo (~1,6 M
 * caractères en base64), même plafond que la couverture roman.
 */
export const MAX_IMAGE_FIELD_CHARS = 1_600_000;

export const fieldLayoutSchema = z.object({
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).max(199),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(2).max(199),
});
export type FieldLayout = z.infer<typeof fieldLayoutSchema>;

const baseField = {
  id: fieldIdSchema,
  label: fieldLabelSchema,
  help: z.string().trim().max(200).optional(),
  /** Longueur rendue dans la fiche (défaut : plein, sauf nombre/counter). */
  width: fieldWidthSchema.optional(),
  /** Taille du contrôle (défaut : md). */
  size: z.enum(["sm", "md"]).optional(),
  /** Largeur libre sur la grille 12 colonnes (éditeur canvas) ; prime sur `width`. */
  span: z.number().int().min(1).max(12).optional(),
  /** Hauteur minimale du bloc dans la fiche (px, multiples de 8) ; absente = auto. */
  minHeight: z.number().int().min(48).max(640).optional(),
  /** Position/étendue sur le canvas d'édition ; absente = packée automatiquement. */
  layout: fieldLayoutSchema.optional(),
};

/** Option partagée select / multiSelect / colonne select de liste. */
const selectOptionSchema = z.object({
  value: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale attendue.")
    .optional(),
});
export type SelectOption = z.infer<typeof selectOptionSchema>;

/** Source d'options : liste statique ou notes de la campagne (motif tag). */
const optionSourceSchema = z.enum(["static", "wiki"]).optional();
const optionTargetCategorySchema = z.string().trim().max(120).optional();

/** Colonne d'un champ tabulaire (lignes = Entity.data[fieldId]). */
const listColumnSchema = z.object({
  id: fieldIdSchema,
  label: z.string().trim().min(1).max(40),
  // `toggle` : booléen (équipé / actif) ; `formula` : expression calculée par ligne.
  type: z.enum(["text", "number", "select", "tag", "toggle", "formula"]),
  options: z.array(selectOptionSchema).max(50).optional(), // colonne select
  targetCategory: optionTargetCategorySchema, // colonne tag (notes)
});
export type ListColumn = z.infer<typeof listColumnSchema>;

export const templateFieldSchema = z.discriminatedUnion("kind", [
  // Texte court (short text Amsel)
  z.object({
    ...baseField,
    kind: z.literal("text"),
    default: z.string().max(500).optional(),
    /** Limite de caractères saisie (défaut serveur : 5000). */
    maxLength: z.number().int().min(1).max(5_000).optional(),
  }),
  // Zone de texte libre (multi-lignes)
  z.object({
    ...baseField,
    kind: z.literal("textarea"),
    default: z.string().max(5_000).optional(),
    maxLength: z.number().int().min(1).max(5_000).optional(),
  }),
  // Nombre mesuré (quantum Amsel : unité, défaut, décimales)
  z.object({
    ...baseField,
    kind: z.literal("number"),
    default: z.number().optional(),
    unit: z.string().trim().max(16).optional(),
    decimals: z.number().int().min(0).max(4).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    // Expression de jet optionnelle (ex. `1d20 + @mod`) — bouton dé sur la fiche.
    roll: z.string().trim().max(100).optional(),
  }),
  // Compteur (+/-) : PV, charges, niveaux…
  z.object({
    ...baseField,
    kind: z.literal("counter"),
    default: z.number().int().min(0).optional(),
    max: z.number().int().min(1).optional(),
    step: z.number().int().min(1).max(99).optional(),
    // Expression de jet optionnelle (ex. `1d20 + @mod`) — bouton dé sur la fiche.
    roll: z.string().trim().max(100).optional(),
  }),
  // Liste de choix avec couleur par option (option Amsel) ;
  // `source: "wiki"` = options = titres des notes de la campagne,
  // `free` = valeur arbitraire acceptée (datalist côté form).
  z.object({
    ...baseField,
    kind: z.literal("select"),
    // min(1) migre au superRefine d'écriture : la lecture reste permissive
    // (source wiki : options statiques vides possibles).
    options: z.array(selectOptionSchema).max(50),
    default: z.string().max(80).optional(),
    source: optionSourceSchema,
    targetCategory: optionTargetCategorySchema,
    free: z.boolean().optional(),
  }),
  // Choix multiples (tags de sorts…) : stocke string[]
  z.object({
    ...baseField,
    kind: z.literal("multiSelect"),
    options: z.array(selectOptionSchema).max(50),
    default: z.array(z.string().max(80)).max(50).optional(),
    source: optionSourceSchema,
    targetCategory: optionTargetCategorySchema,
    free: z.boolean().optional(),
  }),
  // Liste répétable à colonnes (inventaire, sorts, compétences…) ;
  // les lignes vivent dans Entity.data[fieldId], pas dans le schema.
  z.object({
    ...baseField,
    kind: z.literal("list"),
    columns: z.array(listColumnSchema).min(1).max(12),
  }),
  // Sort / compétence : mêmes lignes que `list` + colonnes conventionnelles
  // (coût, recharge, formule de dégâts, actif/passif, modificateur passif).
  z.object({
    ...baseField,
    kind: z.literal("ability"),
    columns: z.array(listColumnSchema).min(1).max(12),
  }),
  // Inventaire / équipement : mêmes lignes que `list` + colonne `equipe`
  // et modificateurs de stats des objets équipés.
  z.object({
    ...baseField,
    kind: z.literal("inventory"),
    columns: z.array(listColumnSchema).min(1).max(12),
  }),
  // Interrupteur (divergence Amsel)
  z.object({
    ...baseField,
    kind: z.literal("toggle"),
    default: z.boolean().optional(),
  }),
  // Lien vers une note du wiki (tag Amsel → devient wikilink exploitable)
  z.object({
    ...baseField,
    kind: z.literal("tag"),
    // Filtre optionnel : seules les notes de cette catégorie de template
    targetCategory: z.string().trim().max(120).optional(),
    // Sélection multiple : la valeur devient un tableau d'ids de notes.
    multiple: z.boolean().optional(),
  }),
  // Image (URL ou chemin) avec aperçu dans la fiche (inspiré de Foundry)
  z.object({
    ...baseField,
    kind: z.literal("image"),
    default: z.string().trim().max(MAX_IMAGE_FIELD_CHARS).optional(),
    height: z.number().int().min(16).max(2000).optional(), // hauteur max d’affichage (px)
  }),
  // Calcul (unique à Aetheris) : expréc mathématique sur d'autres champs
  z.object({
    ...baseField,
    kind: z.literal("formula"),
    expr: z.string().trim().min(1, "Expression requise.").max(200, "Expression trop longue."),
    decimals: z.number().int().min(0).max(4).optional(),
    unit: z.string().trim().max(16).optional(),
    // Expression de jet optionnelle (ex. `1d20 + @mod`) — bouton dé sur la fiche.
    roll: z.string().trim().max(100).optional(),
  }),
  // CSS custom par fiche (sanitisé côté serveur à l'enregistrement)
  z.object({
    ...baseField,
    kind: z.literal("css"),
    default: z.string().max(20_000).optional(),
  }),
  // JS exécuté en sandbox iframe (jamais la page), retourne la valeur affichée
  z.object({
    ...baseField,
    kind: z.literal("js"),
    default: z.string().max(20_000).optional(),
  }),
]);

export type TemplateField = z.infer<typeof templateFieldSchema>;
export type TemplateFieldKind = TemplateField["kind"];

/** Colonnes conventionnelles des modificateurs passifs (scope de formules). */
export const ABILITY_MODIFIER_COLUMNS = {
  active: "actif",
  stat: "stat",
  amount: "mod",
  mode: "mod_type",
} as const;
export const INVENTORY_MODIFIER_COLUMNS = {
  active: "equipe",
  stat: "stat",
  amount: "mod",
  mode: "mod_type",
} as const;

/** Largeur canonique : les anciennes valeurs sm/md sont conservées en lecture. */
export function fieldWidthToken(
  width: FieldWidth | undefined,
  kind: TemplateFieldKind,
): "1/4" | "1/3" | "1/2" | "3/4" | "full" {
  switch (width) {
    case "sm":
    case "1/4":
      return "1/4";
    case "1/3":
      return "1/3";
    case "md":
    case "1/2":
      return "1/2";
    case "3/4":
      return "3/4";
    case "full":
      return "full";
    default:
      return kind === "number" || kind === "counter" ? "1/4" : "full";
  }
}

/** Nombre de colonnes (sur 12) occupées sur la grille de fiche. */
export function fieldWidthSpan(
  width: FieldWidth | undefined,
  kind: TemplateFieldKind,
): 3 | 4 | 6 | 9 | 12 {
  const token = fieldWidthToken(width, kind);
  return token === "full"
    ? 12
    : token === "3/4"
      ? 9
      : token === "1/2"
        ? 6
        : token === "1/3"
          ? 4
          : 3;
}

/** Colonnes occupées (1..12) : `span` du canvas sinon largeur historique/défaut. */
export function fieldSpan(field: {
  span?: number;
  width?: FieldWidth;
  kind: TemplateFieldKind;
}): number {
  return field.span ?? fieldWidthSpan(field.width, field.kind);
}

/** Hauteur de rangées d'un champ liste sans layout : 10*16 + 9*8 = 232 px. */
export const LIST_FIELD_DEFAULT_ROWS = 10;
/** Hauteur par défaut d'un champ « texte long » : 6*16 + 5*8 = 136 px. */
export const TEXTAREA_FIELD_DEFAULT_ROWS = 6;

/** Layout effectif : `layout` fait autorité, sinon `span` (legacy), sinon une carte 2×2. */
export function fieldLayout(field: {
  layout?: FieldLayout | undefined;
  span?: number | undefined;
  kind?: TemplateFieldKind | undefined;
}): FieldLayout {
  const w = Math.min(GRID_COLS, Math.max(1, field.layout?.w ?? field.span ?? 2));
  // Les tableaux ont besoin d'air : titre + en-tête + lignes + pied restent lisibles.
  const listKind = field.kind === "list" || field.kind === "ability" || field.kind === "inventory";
  // Un texte long (ou le CSS legacy) ne tient pas dans le défaut 2×2 : libellé + zone.
  const tallKind = field.kind === "textarea" || field.kind === "css";
  const defaultH = listKind ? LIST_FIELD_DEFAULT_ROWS : tallKind ? TEXTAREA_FIELD_DEFAULT_ROWS : 2;
  const h = Math.min(199, Math.max(2, field.layout?.h ?? defaultH));
  return {
    x: Math.min(GRID_COLS - w, Math.max(0, field.layout?.x ?? 0)),
    y: Math.min(199 - h, Math.max(0, field.layout?.y ?? 0)),
    w,
    h,
  };
}

/** vrai si le rectangle (x,y,w,h) ne touche aucun autre champ (hors `ignoreIndex`). */
export function cellsFree(
  fields: TemplateField[],
  x: number,
  y: number,
  w: number,
  h: number,
  ignoreIndex: number,
): boolean {
  return !fields.some((f, i) => {
    // Les champs CSS hérités ne sont plus rendus : ils ne bloquent aucun placement.
    if (i === ignoreIndex || f.kind === "css") return false;
    const l = fieldLayout(f);
    return x < l.x + l.w && l.x < x + w && y < l.y + l.h && l.y < y + h;
  });
}

/** Attribue un layout sans chevauchement aux champs qui n'en ont pas (ordre du tableau). */
export function packFields(fields: TemplateField[]): TemplateField[] {
  const placed = fields.filter((f) => f.layout);
  return fields.map((field) => {
    if (field.layout) return field;
    const { w, h } = fieldLayout(field);
    let spot: { x: number; y: number } | null = null;
    for (let y = 0; y <= 199 - h && !spot; y++) {
      for (let x = 0; x + w <= GRID_COLS; x++) {
        if (cellsFree(placed, x, y, w, h, -1)) {
          spot = { x, y };
          break;
        }
      }
    }
    const packed: TemplateField = { ...field, layout: { x: spot?.x ?? 0, y: spot?.y ?? 0, w, h } };
    placed.push(packed);
    return packed;
  });
}

export const templateSchemaSchema = z.object({
  fields: z.array(templateFieldSchema).max(60, "60 champs maximum."),
});
export type TemplateSchema = z.infer<typeof templateSchemaSchema>;

/** Catégorie de template (ex. « Encyclopédie », « Bestiaire »). */
export const templateCategorySchema = z
  .string()
  .trim()
  .min(1)
  .max(120, "Catégorie trop longue (120 caractères max).");

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(120),
  category: templateCategorySchema.optional(),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    category: templateCategorySchema.nullable().optional(),
    schema: templateSchemaSchema.optional(),
    /** CSS propre au modèle (sanitisé côté serveur). null = effacer. */
    customCss: z.string().max(20_000).nullable().optional(),
  })
  // Uniquement à l'écriture : une expression de jet invalide ne doit pas
  // rendre toutes les fiches existantes illisibles (templateSchemaSchema
  // reste permissif à la lecture).
  .superRefine((val, ctx) => {
    const fields = val.schema?.fields;
    if (!fields) return;
    const usedIds = new Set(fields.map((f) => f.id));
    const usedAggregateKeys = new Set<string>();
    for (const [i, field] of fields.entries()) {
      if ("roll" in field && field.roll) {
        try {
          parseRollExpression(field.roll.replace(/@[a-z0-9_-]+/gi, "0"));
        } catch (e) {
          if (!(e instanceof DiceError)) throw e;
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["schema", "fields", i, "roll"],
            message: `Expression de jet invalide : ${e.message}`,
          });
        }
      }
      // Options obligatoires sauf source wiki (notes = options à l'affichage).
      if ((field.kind === "select" || field.kind === "multiSelect") && field.source !== "wiki") {
        if (field.options.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["schema", "fields", i, "options"],
            message: "Au moins une option (ou source « notes »).",
          });
        }
      }
      if (field.kind === "list" || field.kind === "ability" || field.kind === "inventory") {
        const seen = new Set<string>();
        for (const [j, col] of field.columns.entries()) {
          if (seen.has(col.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["schema", "fields", i, "columns", j, "id"],
              message: "Identifiant de colonne dupliqué.",
            });
          }
          seen.add(col.id);
          if (col.id === "n") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["schema", "fields", i, "columns", j, "id"],
              message: 'Identifiant "n" réservé (compteur de lignes).',
            });
          }
          // Agrégats exposés aux formules : <champ>_<col> et <champ>_n.
          if (col.type === "number") {
            const key = `${field.id}_${col.id}`;
            if (usedIds.has(key) || usedAggregateKeys.has(key)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["schema", "fields", i, "columns", j, "id"],
                message: `Clé d'agrégat « ${key} » en collision avec un identifiant existant.`,
              });
            }
            usedAggregateKeys.add(key);
          }
        }
        const countKey = `${field.id}_n`;
        if (usedIds.has(countKey) || usedAggregateKeys.has(countKey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["schema", "fields", i, "columns"],
            message: `Clé d'agrégat « ${countKey} » en collision avec un identifiant existant.`,
          });
        }
        usedAggregateKeys.add(countKey);
      }
    }
  });
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

/** Sauvegarde des valeurs saisies dans une fiche (Entity.data). */
export const saveTemplateDataSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});
export type SaveTemplateDataInput = z.infer<typeof saveTemplateDataSchema>;

/**
 * Nettoie des valeurs brutes contre le schéma du template :
 * - ignore les clés inconnues ;
 * - applique le type attendu par kind (nombre, booléen, chaîne…) ;
 * - remet la valeur par défaut si absente/incorrecte.
 * Utilisé côté serveur avant stockage dans `Entity.data`.
 */
export function sanitizeFieldData(
  schema: TemplateSchema,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const v = raw[field.id];
    switch (field.kind) {
      case "text":
      case "textarea": {
        const cap = field.maxLength ?? 5_000;
        out[field.id] = typeof v === "string" ? v.slice(0, cap) : (field.default ?? "");
        break;
      }
      case "number": {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n)) {
          let clamped = n;
          if (field.decimals === 0) clamped = Math.round(clamped); // entier
          if (field.min !== undefined) clamped = Math.max(field.min, clamped);
          if (field.max !== undefined) clamped = Math.min(field.max, clamped);
          out[field.id] = clamped;
        } else {
          out[field.id] = field.default ?? null;
        }
        break;
      }
      case "counter": {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n)) {
          let c = Math.max(0, Math.round(n));
          if (field.max !== undefined) c = Math.min(field.max, c);
          out[field.id] = c;
        } else {
          out[field.id] = field.default ?? 0;
        }
        break;
      }
      case "select": {
        // free / source wiki : appartenance non vérifiable sans DB
        // (même limite que `tag`) — on garde la string non vide.
        if (field.free || field.source === "wiki") {
          out[field.id] =
            typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : (field.default ?? null);
          break;
        }
        const valid = field.options.some((o) => o.value === v);
        out[field.id] = valid
          ? v
          : field.default !== undefined && field.options.some((o) => o.value === field.default)
            ? field.default
            : null;
        break;
      }
      case "multiSelect": {
        const open = field.free || field.source === "wiki";
        const fallback = field.default ?? [];
        if (!Array.isArray(v)) {
          out[field.id] = fallback;
          break;
        }
        const cleaned = v
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .filter((x) => (open ? true : field.options.some((o) => o.value === x)))
          .slice(0, 50);
        out[field.id] = [...new Set(cleaned)].map((x) => x.slice(0, 80));
        break;
      }
      case "toggle":
        out[field.id] = typeof v === "boolean" ? v : (field.default ?? false);
        break;
      case "tag":
        if (field.multiple) {
          if (!Array.isArray(v)) {
            out[field.id] = [];
            break;
          }
          const cleaned = v
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .map((x) => x.trim().slice(0, 80));
          out[field.id] = [...new Set(cleaned)].slice(0, 50);
          break;
        }
        out[field.id] = typeof v === "string" && v.length > 0 ? v : null;
        break;
      case "list":
      case "ability":
      case "inventory": {
        if (!Array.isArray(v)) {
          out[field.id] = [];
          break;
        }
        const rows: Record<string, unknown>[] = [];
        for (const raw of v.slice(0, 100)) {
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
          const src = raw as Record<string, unknown>;
          const row: Record<string, unknown> = {};
          for (const col of field.columns) {
            const cv = src[col.id];
            switch (col.type) {
              case "text":
                if (typeof cv === "string") row[col.id] = cv.slice(0, 300);
                break;
              case "tag":
                if (typeof cv === "string" && cv.trim()) row[col.id] = cv.slice(0, 80);
                break;
              case "number": {
                const n = typeof cv === "number" ? cv : Number(cv);
                if (Number.isFinite(n)) row[col.id] = n;
                break;
              }
              case "select": {
                const opts = col.options ?? [];
                if (opts.some((o) => o.value === cv)) row[col.id] = cv;
                break;
              }
              case "toggle":
                if (typeof cv === "boolean") row[col.id] = cv;
                break;
              case "formula":
                if (typeof cv === "string" && cv.trim()) row[col.id] = cv.slice(0, 300);
                break;
            }
          }
          rows.push(row);
        }
        out[field.id] = rows;
        break;
      }
      case "image":
        out[field.id] =
          typeof v === "string" ? v.slice(0, MAX_IMAGE_FIELD_CHARS) : (field.default ?? "");
        break;
      case "formula":
        break; // calculé à l'affichage, jamais stocké
      case "css":
      case "js":
        out[field.id] = typeof v === "string" ? v.slice(0, 20_000) : (field.default ?? "");
        break;
    }
  }
  // Les blocs structurés (y compris sur fiche) survivent à l'autosave :
  // le client ne les renvoie pas, on conserve ceux déjà stockés.
  const blocks = noteBlocksSchema.safeParse(raw.blocks);
  if (blocks.success) out.blocks = blocks.data;
  return out;
}
