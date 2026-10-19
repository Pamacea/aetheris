import { z } from "zod";

export const novelStatusSchema = z.enum(["draft", "writing", "published"]);
export type NovelStatus = z.infer<typeof novelStatusSchema>;

export const chapterStatusSchema = z.enum(["draft", "review", "published"]);
export type ChapterStatus = z.infer<typeof chapterStatusSchema>;

export const createNovelSchema = z.object({
  title: z.string().min(1).max(200),
  synopsis: z.string().max(5000).optional(),
});
export type CreateNovelInput = z.infer<typeof createNovelSchema>;

export const updateNovelSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  synopsis: z.string().max(5000).nullable().optional(),
  status: novelStatusSchema.optional(),
  coverImage: z.string().nullable().optional(),
});
export type UpdateNovelInput = z.infer<typeof updateNovelSchema>;

export const createChapterSchema = z.object({
  title: z.string().min(1).max(200),
});
export type CreateChapterInput = z.infer<typeof createChapterSchema>;

/** Autosave : debounce ~1s côté client */
export const saveChapterContentSchema = z.object({
  /** Document TipTap (JSON) */
  content: z.unknown(),
  wordCount: z.number().int().min(0),
});
export type SaveChapterContentInput = z.infer<typeof saveChapterContentSchema>;

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: chapterStatusSchema.optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
