import { z } from "zod";

/** Titre de note wiki (résolution des liens [[...]] par titre, par campagne). */
export const wikiTitleSchema = z
  .string()
  .trim()
  .min(1, "Le titre est requis.")
  .max(200, "Titre trop long (200 caractères max).");

export const wikiFolderSchema = z
  .string()
  .trim()
  .min(1)
  .max(120, "Chemin de dossier trop long (120 caractères max).");

export const createWikiNoteSchema = z.object({
  title: wikiTitleSchema,
  folder: wikiFolderSchema.optional(),
  // Note basée sur un template : Entity.type = templateId (sinon "note")
  templateId: z.uuid().optional(),
});
export type CreateWikiNoteInput = z.infer<typeof createWikiNoteSchema>;

export const updateWikiNoteSchema = z.object({
  title: wikiTitleSchema.optional(),
  folder: wikiFolderSchema.nullable().optional(),
  gmOnly: z.boolean().optional(),
});
export type UpdateWikiNoteInput = z.infer<typeof updateWikiNoteSchema>;

export const saveWikiNoteSchema = z.object({
  contentHtml: z.string().max(500_000, "Note trop volumineuse (500 Ko max)."),
});
export type SaveWikiNoteInput = z.infer<typeof saveWikiNoteSchema>;

/** Kind d'un bloc de métadonnées structurées (panneau « Blocs »). */
export const noteBlockKindSchema = z.enum([
  "date",
  "event",
  "description",
  "category",
  "custom",
  "macro",
]);

export const noteBlockSchema = z.object({
  id: z.string().min(1).max(64),
  kind: noteBlockKindSchema,
  label: z
    .string()
    .trim()
    .min(1, "Libellé requis.")
    .max(80, "Libellé trop long (80 caractères max)."),
  value: z.string().trim().max(300, "Valeur trop longue (300 caractères max)."),
  /** Bloc réservé MJ : filtré côté serveur pour les joueurs. */
  gm: z.boolean().optional(),
  /** Kind « macro » : expression de calcul sur une fiche (ex. force + constitution). */
  expr: z.string().trim().max(200).optional(),
  /** Kind « macro » : expression de jet optionnelle (ex. 1d20 + @mod). */
  roll: z.string().trim().max(100).optional(),
  /** Kind « macro » : fiche source de la portée (défaut : note courante si c'est une fiche). */
  refNoteId: z.uuid().optional(),
  /** Taille d'affichage du bloc (défaut absent = md). */
  size: z.enum(["sm", "md", "lg"]).optional(),
});
export type NoteBlock = z.infer<typeof noteBlockSchema>;

/** Métadonnées structurées d'une note ou d'une fiche — stockées dans
 *  Entity.data.blocks. */
export const noteBlocksSchema = z.array(noteBlockSchema).max(50, "50 blocs maximum par note.");
