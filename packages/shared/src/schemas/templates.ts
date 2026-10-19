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

const baseField = {
  id: fieldIdSchema,
  label: fieldLabelSchema,
  help: z.string().trim().max(200).optional(),
  /** Longueur rendue dans la fiche (défaut : plein, sauf nombre/counter). */
  width: z.enum(["sm", "md", "full"]).optional(),
  /** Taille du contrôle (défaut : md). */
  size: z.enum(["sm", "md"]).optional(),
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

/** Colonne d'un champ `list` (types simples ; lignes = Entity.data[fieldId]). */
const listColumnSchema = z.object({
  id: fieldIdSchema,
  label: z.string().trim().min(1).max(40),
  type: z.enum(["text", "number", "select", "tag"]),
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
  }),
  // Image (URL ou chemin) avec aperçu dans la fiche (inspiré de Foundry)
  z.object({
    ...baseField,
    kind: z.literal("image"),
    default: z.string().trim().max(500).optional(),
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
      if (field.kind === "list") {
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
        out[field.id] = typeof v === "string" && v.length > 0 ? v : null;
        break;
      case "list": {
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
            }
          }
          rows.push(row);
        }
        out[field.id] = rows;
        break;
      }
      case "image":
        out[field.id] = typeof v === "string" ? v.slice(0, 500) : (field.default ?? "");
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
