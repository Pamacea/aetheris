"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createChapterSchema,
  createNovelSchema,
  saveChapterContentSchema,
  setNovelShareSchema,
  updateChapterSchema,
  updateNovelSchema,
} from "@aetheris/shared";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNovelRole } from "./access";
import { chapterStatusPatch, countDocWords, isPlainObject, isValidCoverImage } from "./logic";

export type NovelActionResult = { ok: true; id: string } | { ok: false; error: string };

function invalid(error: string): NovelActionResult {
  return { ok: false, error };
}

/** Id de l'auteur connecté ; null si non connecté. */
async function requireAuthor(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

/** Vérifie que l'utilisateur peut éditer le roman (auteur ou collaborateur). */
async function requireNovelEditor(userId: string, novelId: string): Promise<boolean> {
  return (await getNovelRole(novelId, userId)) !== null;
}

/** Auteur seul : métadonnées, publication et suppression du roman. */
async function requireNovelAuthor(userId: string, novelId: string): Promise<boolean> {
  return (await getNovelRole(novelId, userId)) === "author";
}

function revalidateNovel(novelId: string): void {
  revalidatePath("/novels");
  revalidatePath("/library");
  revalidatePath(`/novels/${novelId}`);
}

// ───────────────────────── Romans ─────────────────────────

export async function createNovel(input: {
  title: string;
  synopsis?: string;
  genre?: string | null;
  tags?: string[];
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
      genre: parsed.data.genre ?? null,
      tags: parsed.data.tags ?? [],
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
    genre?: string | null;
    tags?: string[];
  },
): Promise<NovelActionResult> {
  const userId = await requireAuthor();
  if (!userId) return invalid("Non connecté.");
  if (!(await requireNovelAuthor(userId, novelId))) return invalid("Roman introuvable.");

  const parsed = updateNovelSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }
  if (Object.keys(parsed.data).length === 0) return invalid("Rien à modifier.");
  if (parsed.data.coverImage !== undefined && !isValidCoverImage(parsed.data.coverImage)) {
    return invalid("Image de couverture invalide (image, ~1,2 Mo max).");
  }

  await prisma.novel.update({ where: { id: novelId }, data: parsed.data });

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
  if (!(await requireNovelEditor(userId, novelId))) return invalid("Roman introuvable.");

  const parsed = createChapterSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Titre invalide.");
  }

  const count = await prisma.chapter.count({ where: { novelId } });
  const chapter = await prisma.chapter.create({
    data: { title: parsed.data.title, position: count, novelId },
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
  const role = await getNovelRole(novelId, userId);
  if (!role) return invalid("Roman introuvable.");
  // L'éditeur écrit ; seul l'auteur publie ou dépublie un chapitre.
  if (input.status !== undefined && role !== "author") {
    return invalid("Publication réservée à l'auteur.");
  }

  const parsed = updateChapterSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }
  if (Object.keys(parsed.data).length === 0) return invalid("Rien à modifier.");

  const owned = await prisma.chapter.findFirst({
    where: { id: chapterId, novelId },
    select: { id: true },
  });
  if (!owned) return invalid("Chapitre introuvable.");

  await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      ...parsed.data,
      // publishedAt suit le statut ( Publié → date, sinon effacée ).
      ...(parsed.data.status !== undefined ? chapterStatusPatch(parsed.data.status) : {}),
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
  if (!(await requireNovelAuthor(userId, novelId))) return invalid("Roman introuvable.");

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
  if (!(await requireNovelEditor(userId, novelId))) return invalid("Roman introuvable.");

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
 * Autosave : document TipTap (JSON) + nombre de mots, debounce ~1 s côté
 * client, brouillon localStorage en secours. Le wordCount envoyé n'est qu'un
 * affichage : il est recalculé ici sur le document réellement persisté.
 */
export async function saveChapterContent(
  novelId: string,
  chapterId: string,
  input: { content: unknown; wordCount: number },
): Promise<NovelActionResult> {
  const userId = await requireAuthor();
  if (!userId) return invalid("Non connecté.");
  if (!(await requireNovelEditor(userId, novelId))) return invalid("Roman introuvable.");

  const parsed = saveChapterContentSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Contenu invalide.");
  }
  if (!isPlainObject(parsed.data.content)) return invalid("Contenu invalide.");

  const owned = await prisma.chapter.findFirst({
    where: { id: chapterId, novelId },
    select: { id: true },
  });
  if (!owned) return invalid("Chapitre introuvable.");

  await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      content: parsed.data.content as object,
      wordCount: countDocWords(parsed.data.content),
    },
  });

  return { ok: true, id: chapterId };
}

// ───────────────────────── Partage ─────────────────────────

export type NovelShareResult = { ok: true; token: string | null } | { ok: false; error: string };

/**
 * Active, change de mode ou révoque le lien de partage.
 * Réservé à l'auteur : un éditeur ne gère pas les droits du roman.
 */
export async function setNovelShare(
  novelId: string,
  mode: "read" | "review" | "edit" | null,
): Promise<NovelShareResult> {
  const userId = await requireAuthor();
  if (!userId) return { ok: false, error: "Non connecté." };

  const parsed = setNovelShareSchema.safeParse({ mode });
  if (!parsed.success) return { ok: false, error: "Mode de partage invalide." };
  const nextMode = parsed.data.mode;

  const novel = await prisma.novel.findFirst({
    where: { id: novelId, authorId: userId },
    select: { id: true, shareToken: true, shareMode: true },
  });
  if (!novel) return { ok: false, error: "Roman introuvable." };

  if (nextMode === null) {
    await prisma.novel.update({
      where: { id: novelId },
      data: { shareToken: null, shareMode: null },
    });
    // Révoquer le lien retire aussi les accès qu'il a accordés.
    await prisma.novelCollaborator.deleteMany({ where: { novelId } });
    revalidatePath(`/novels/${novelId}`);
    return { ok: true, token: null };
  }

  // Quitter le mode éditeur retire les rôles accordés par le lien.
  if (nextMode !== "edit") {
    await prisma.novelCollaborator.deleteMany({ where: { novelId } });
  }

  // Un token de lecture déjà distribué ne doit jamais devenir une invitation à écrire.
  if (novel.shareToken && (nextMode !== "edit" || novel.shareMode === "edit")) {
    await prisma.novel.update({ where: { id: novelId }, data: { shareMode: nextMode } });
    revalidatePath(`/shared/novel/${novel.shareToken}`, "layout");
    revalidatePath(`/novels/${novelId}`);
    return { ok: true, token: novel.shareToken };
  }

  // Boucle courte : une collision de token unique (P2002) est rejouée.
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = randomBytes(9).toString("base64url");
    try {
      await prisma.novel.update({
        where: { id: novelId },
        data: { shareToken: token, shareMode: nextMode },
      });
      revalidatePath(`/shared/novel/${token}`, "layout");
      revalidatePath(`/novels/${novelId}`);
      return { ok: true, token };
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  return { ok: false, error: "Impossible de générer un lien." };
}

/** Acceptation d'un lien « éditeur » : ajoute le collaborateur puis ouvre le roman. */
export async function joinNovelAsEditor(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();

  const session = await getSession();
  if (!session) redirect("/login");

  const novel = await prisma.novel.findFirst({
    where: { shareToken: token, shareMode: "edit" },
    select: { id: true },
  });
  if (!novel) redirect("/library");

  await prisma.novelCollaborator.upsert({
    where: { novelId_userId: { novelId: novel.id, userId: session.user.id } },
    create: { novelId: novel.id, userId: session.user.id, role: "editor" },
    update: {},
  });

  revalidatePath(`/novels/${novel.id}`);
  redirect(`/novels/${novel.id}`);
}
