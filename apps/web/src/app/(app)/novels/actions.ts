"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  createChapterSchema,
  createNovelSchema,
  saveChapterContentSchema,
  updateChapterSchema,
  updateNovelSchema,
} from "@aetheris/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type NovelActionResult = { ok: true; id: string } | { ok: false; error: string };

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Id de l'auteur connecté ; null si non connecté. */
async function requireAuthor(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

/** Vérifie que le roman appartient à l'utilisateur ; null sinon. */
async function requireNovelOwner(userId: string, novelId: string): Promise<boolean> {
  const novel = await prisma.novel.findFirst({
    where: { id: novelId, authorId: userId },
    select: { id: true },
  });
  return novel !== null;
}

function revalidateNovel(novelId: string): void {
  revalidatePath("/novels");
  revalidatePath(`/novels/${novelId}`);
}

// ───────────────────────── Romans ─────────────────────────

export async function createNovel(input: {
  title: string;
  synopsis?: string;
}): Promise<NovelActionResult> {
  const userId = await requireAuthor();
  if (!userId) return invalid("Non connecté.");

  const parsed = createNovelSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Titre invalide.");
  }

  const novel = await prisma.novel.create({
    data: {
      title: parsed.data.title,
      synopsis: parsed.data.synopsis ?? null,
      authorId: userId,
    },
    select: { id: true },
  });

  revalidateNovel(novel.id);
  return { ok: true, id: novel.id };
}

export async function updateNovel(
  novelId: string,
  input: {
    title?: string;
    synopsis?: string | null;
    status?: "draft" | "writing" | "published";
    coverImage?: string | null;
  },
): Promise<NovelActionResult> {
  const userId = await requireAuthor();
  if (!userId) return invalid("Non connecté.");
  if (!(await requireNovelOwner(userId, novelId))) {
    return invalid("Roman introuvable.");
  }

  const parsed = updateNovelSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }
  if (Object.keys(parsed.data).length === 0) return invalid("Rien à modifier.");

  await prisma.novel.update({
    where: { id: novelId },
    data: parsed.data,
  });

  revalidateNovel(novelId);
  return { ok: true, id: novelId };
}

// ───────────────────────── Chapitres ─────────────────────────

export async function createChapter(
  novelId: string,
  input: { title: string },
): Promise<NovelActionResult> {
  const userId = await requireAuthor();
  if (!userId) return invalid("Non connecté.");
  if (!(await requireNovelOwner(userId, novelId))) {
    return invalid("Roman introuvable.");
  }

  const parsed = createChapterSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Titre invalide.");
  }

  const count = await prisma.chapter.count({ where: { novelId } });
  const chapter = await prisma.chapter.create({
    data: {
      title: parsed.data.title,
      position: count,
      novelId,
    },
    select: { id: true },
  });

  revalidateNovel(novelId);
  return { ok: true, id: chapter.id };
}

export async function updateChapter(
  novelId: string,
  chapterId: string,
  input: {
    title?: string;
    status?: "draft" | "review" | "published";
    position?: number;
  },
): Promise<NovelActionResult> {
  const userId = await requireAuthor();
  if (!userId) return invalid("Non connecté.");
  if (!(await requireNovelOwner(userId, novelId))) {
    return invalid("Roman introuvable.");
  }

  const parsed = updateChapterSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }
  if (Object.keys(parsed.data).length === 0) {
    return invalid("Rien à modifier.");
  }

  const owned = await prisma.chapter.findFirst({
    where: { id: chapterId, novelId },
    select: { id: true },
  });
  if (!owned) return invalid("Chapitre introuvable.");

  await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      ...parsed.data,
      ...(parsed.data.status === "published"
        ? { publishedAt: new Date() }
        : parsed.data.status !== undefined
          ? { publishedAt: null }
          : {}),
    },
  });

  revalidateNovel(novelId);
  return { ok: true, id: chapterId };
}

export async function deleteChapter(
  novelId: string,
  chapterId: string,
): Promise<NovelActionResult> {
  const userId = await requireAuthor();
  if (!userId) return invalid("Non connecté.");
  if (!(await requireNovelOwner(userId, novelId))) {
    return invalid("Roman introuvable.");
  }

  const owned = await prisma.chapter.findFirst({
    where: { id: chapterId, novelId },
    select: { id: true },
  });
  if (!owned) return invalid("Chapitre introuvable.");

  await prisma.chapter.delete({ where: { id: chapterId } });
  // Récompactage des positions pour garder un ordre dense.
  const rest = await prisma.chapter.findMany({
    where: { novelId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    rest.map((c, i) => prisma.chapter.update({ where: { id: c.id }, data: { position: i } })),
  );

  revalidateNovel(novelId);
  return { ok: true, id: chapterId };
}

/** Réordonnancement (drag) : liste complète des ids dans l'ordre. */
export async function reorderChapters(
  novelId: string,
  orderedIds: string[],
): Promise<NovelActionResult> {
  const userId = await requireAuthor();
  if (!userId) return invalid("Non connecté.");
  if (!(await requireNovelOwner(userId, novelId))) {
    return invalid("Roman introuvable.");
  }

  const chapters = await prisma.chapter.findMany({
    where: { novelId },
    select: { id: true },
  });
  const valid = new Set(chapters.map((c) => c.id));
  if (orderedIds.length !== chapters.length || !orderedIds.every((id) => valid.has(id))) {
    return invalid("Ordre invalide.");
  }

  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.chapter.update({ where: { id }, data: { position: i } })),
  );

  revalidateNovel(novelId);
  return { ok: true, id: novelId };
}

/**
 * Autosave : document TipTap (JSON) + nombre de mots.
 * Debounce ~1 s côté client ; pas de snapshot d'historique (le wiki gère
 * déjà l'historique, la priorité ici est la perte zéro).
 */
export async function saveChapterContent(
  novelId: string,
  chapterId: string,
  input: { content: unknown; wordCount: number },
): Promise<NovelActionResult> {
  const userId = await requireAuthor();
  if (!userId) return invalid("Non connecté.");
  if (!(await requireNovelOwner(userId, novelId))) {
    return invalid("Roman introuvable.");
  }

  const parsed = saveChapterContentSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Contenu invalide.");
  }

  const owned = await prisma.chapter.findFirst({
    where: { id: chapterId, novelId },
    select: { id: true },
  });
  if (!owned) return invalid("Chapitre introuvable.");

  await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      content: parsed.data.content as object,
      wordCount: parsed.data.wordCount,
    },
  });

  return { ok: true, id: chapterId };
}
