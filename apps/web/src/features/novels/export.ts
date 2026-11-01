import { isPlainObject } from "./logic";

/**
 * Sérialisation pure de l'archive auteur (un JSON par roman).
 * Aucune dépendance à Prisma, à Next ou à JSZip : le route handler ne fait
 * que lire la base, assembler le ZIP et renvoyer la réponse.
 */

export const NOVEL_EXPORT_FORMAT = "aetheris-novel";
export const NOVEL_EXPORT_VERSION = 1;

export interface ChapterExportSource {
  id: string;
  title: string;
  position: number;
  status: string;
  wordCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  content: unknown;
}

export interface NovelExportSource {
  id: string;
  title: string;
  synopsis: string | null;
  status: string;
  genre: string | null;
  tags: string[];
  coverImage: string | null;
  createdAt: Date;
  updatedAt: Date;
  chapters: ChapterExportSource[];
}

export interface ChapterExport {
  id: string;
  title: string;
  position: number;
  status: string;
  wordCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Document TipTap brut, réutilisable pour une réimportation. */
  content: unknown;
  /** Texte brut extrait pour lecture ou indexation. */
  text: string;
}

export interface NovelExport {
  format: typeof NOVEL_EXPORT_FORMAT;
  version: typeof NOVEL_EXPORT_VERSION;
  exportedAt: string;
  id: string;
  title: string;
  synopsis: string | null;
  status: string;
  genre: string | null;
  tags: string[];
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  chapters: ChapterExport[];
}

/** Nœuds qui se terminent par un saut de ligne dans le texte extrait. */
const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "listItem",
  "tableRow",
]);

/**
 * Document TipTap → texte brut. Même source JSON que l'export imprimable
 * (`TiptapContent`), mais aplatie pour un fichier lisible hors application.
 */
export function docToText(content: unknown): string {
  const parts: string[] = [];

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isPlainObject(node)) return;

    if (typeof node.text === "string") {
      parts.push(node.text);
      return;
    }
    if (node.type === "hardBreak") {
      parts.push("\n");
      return;
    }
    if (node.content !== undefined) {
      const before = parts.length;
      walk(node.content);
      if (BLOCK_TYPES.has(String(node.type)) && parts.length > before) parts.push("\n");
    }
  };

  walk(content);
  return parts
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Slug ASCII sûr pour les noms de fichiers du ZIP (pas d'accents ni de `/`). */
export function asciiSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Nom unique et ASCII : préfixe numérique contre les titres identiques. */
export function novelFileName(title: string, index: number): string {
  return `${String(index + 1).padStart(2, "0")}-${asciiSlug(title) || "roman"}.json`;
}

/** `aetheris-romans-AAAA-MM-JJ.zip` — ASCII uniquement. */
export function archiveFileName(date: Date): string {
  return `aetheris-romans-${date.toISOString().slice(0, 10)}.zip`;
}

/** Chapitres triés par position, dates en ISO, texte extrait du JSON TipTap. */
export function serializeNovel(source: NovelExportSource, exportedAt: Date): NovelExport {
  const chapters = [...source.chapters]
    .sort((a, b) => a.position - b.position)
    .map((chapter): ChapterExport => ({
      id: chapter.id,
      title: chapter.title,
      position: chapter.position,
      status: chapter.status,
      wordCount: chapter.wordCount,
      publishedAt: chapter.publishedAt ? chapter.publishedAt.toISOString() : null,
      createdAt: chapter.createdAt.toISOString(),
      updatedAt: chapter.updatedAt.toISOString(),
      content: chapter.content ?? null,
      text: docToText(chapter.content),
    }));

  return {
    format: NOVEL_EXPORT_FORMAT,
    version: NOVEL_EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    id: source.id,
    title: source.title,
    synopsis: source.synopsis,
    status: source.status,
    genre: source.genre,
    tags: [...source.tags],
    coverImage: source.coverImage,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    chapters,
  };
}

export const EXPORT_README = `Aetheris — archive de vos romans
================================

Contenu de l'archive
--------------------
- Un fichier .json par roman, nommé NN-titre.json (NN = ordre de la liste).
- Chaque fichier contient : titre, synopsis, statut, genre, tags, dates,
  couverture (coverImage) et les chapitres triés par position.
- "content" est le document TipTap/ProseMirror brut (JSON).
- "text" est le texte brut extrait du document, pratique pour la lecture.

Périmètre
---------
Seuls les romans dont vous êtes l'auteur sont exportés. Les collaborations,
les liens de partage, l'historique des versions et les images binaires sont
exclus. coverImage n'est qu'une URL ou une data-url : aucune image n'est
téléchargée dans l'archive.
`;
