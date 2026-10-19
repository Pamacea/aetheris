import { countWords } from "@/lib/novel-autosave";

/**
 * Logique pure du studio d'écriture — ni Prisma, ni React, ni "use server" :
 * c'est la seule partie testable sans base ni DOM.
 */

/** Recompose l'ordre après un déplacement (drag) : `ids[from]` va en `to`. */
export function moveItem(ids: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) {
    return [...ids];
  }
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/**
 * Transition de statut d'un chapitre : seule la publication date le chapitre ;
 * repasser en brouillon/relecture efface la date (le chapitre redevient privé).
 */
export function chapterStatusPatch(status: "draft" | "review" | "published"): {
  publishedAt: Date | null;
} {
  return { publishedAt: status === "published" ? new Date() : null };
}

/** Document TipTap attendu : objet JSON (ni tableau, ni scalaire). */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Nombre de mots d'un document TipTap : somme des nœuds `text` imbriqués.
 * Recalculé côté serveur à chaque sauvegarde — le compteur client ne fait
 * que de l'affichage, il n'est jamais la source de vérité.
 */
export function countDocWords(content: unknown): number {
  if (!isPlainObject(content)) return 0;
  let total = 0;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isPlainObject(node)) return;
    if (typeof node.text === "string") total += countWords(node.text);
    if (node.content !== undefined) walk(node.content);
  };
  walk(content);
  return total;
}

/** Base64 d'une image (~1,2 Mo d'image → ~1,6 M de caractères) + marge. */
export const MAX_COVER_CHARS = 1_600_000;

/**
 * Frontière de confiance pour `coverImage` : null/vid = retirée, URL http(s)
 * courte, ou data-url image sous la limite — sinon le champ textuel de la
 * base se remplirait de n'importe quoi.
 */
export function isValidCoverImage(value: string | null | undefined): boolean {
  if (!value) return true;
  if (value.startsWith("http://") || value.startsWith("https://")) return value.length <= 2_048;
  return value.startsWith("data:image/") && value.length <= MAX_COVER_CHARS;
}
