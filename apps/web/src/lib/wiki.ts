/**
 * Utilitaires wiki isomorphes (client + serveur) :
 * - liens [[...]] stockés en `<a data-wiki-link="Titre" data-wiki-link-id="…">`
 *   (l'id est absent des liens antérieurs ; le titre sert alors de repli)
 * - blocs secrets MJ stockés en `<gm-secret>…</gm-secret>`
 */

const GM_SECRET_RE = /<gm-secret\b[^>]*>[\s\S]*?<\/gm-secret>/gi;
const WIKILINK_RE = /data-wiki-link="([^"]*)"/g;
const WIKILINK_ID_RE = /data-wiki-link-id="([^"]*)"/g;

function decodeAttr(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

/** Supprime les blocs secrets MJ (filtrage serveur pour les joueurs). */
export function stripGmSecrets(html: string | null | undefined): string {
  if (!html) return "";
  let out = html.replace(GM_SECRET_RE, "");
  // Fail-closed : un <gm-secret> non fermé englobe tout le reste selon un
  // parseur — on retire jusqu'à la fin plutôt que de laisser fuiter le secret.
  out = out.replace(/<gm-secret\b[^>]*>[\s\S]*$/i, "");
  // Tags orphelins restants (fermets d'un nest non strippable).
  return out.replace(/<\/?gm-secret\b[^>]*>/gi, "");
}

/** Liste unique des titres liés dans un document HTML. */
export function parseWikiLinks(html: string | null | undefined): string[] {
  if (!html) return [];
  const titles = new Set<string>();
  for (const match of html.matchAll(WIKILINK_RE)) {
    const title = decodeAttr(match[1] ?? "").trim();
    if (title.length > 0) titles.add(title);
  }
  return [...titles];
}

/** Ids d'entités liés dans un document HTML (liens récents uniquement). */
export function parseWikiLinkIds(html: string | null | undefined): string[] {
  if (!html) return [];
  const ids = new Set<string>();
  for (const match of html.matchAll(WIKILINK_ID_RE)) {
    const id = decodeAttr(match[1] ?? "").trim();
    if (id.length > 0) ids.add(id);
  }
  return [...ids];
}
