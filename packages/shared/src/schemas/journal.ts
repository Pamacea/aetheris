import { z } from "zod";

/**
 * Module Journal & Captures (Phase 8).
 * Handouts (texte + image) créés par le MJ, partageables aux joueurs.
 */

export const handoutSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(160),
  /** Texte libre du handout (markdown brut / plaintext). */
  content: z.string().max(10000),
  /** URL ou data-URI de l'image/capture. */
  imageUrl: z.string().max(2048).nullable(),
  /** false = brouillon visible du MJ seul. */
  shared: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type Handout = z.infer<typeof handoutSchema>;

export const createHandoutSchema = z.object({
  title: z.string().min(1).max(160),
  content: z.string().max(10000).default(""),
  imageUrl: z.string().max(2048).nullish(),
  /** false/omis = brouillon MJ seul (JournalEntry.shared). */
  shared: z.boolean().optional(),
});
export type CreateHandout = z.infer<typeof createHandoutSchema>;

export const updateHandoutSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  content: z.string().max(10000).optional(),
  imageUrl: z.string().max(2048).nullish(),
  shared: z.boolean().optional(),
});
export type UpdateHandout = z.infer<typeof updateHandoutSchema>;

/** Type d'événement WS du relais générique : « la liste a changé ». */
export const JOURNAL_CHANGED_EVENT = "journal:changed";
