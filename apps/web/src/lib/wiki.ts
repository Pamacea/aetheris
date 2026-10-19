/**
 * Utilitaires wiki isomorphes (client + serveur) :
 * - liens [[...]] stockés en `<a data-wiki-link="Titre">`
 * - blocs secrets MJ stockés en `<gm-secret>…</gm-secret>`
 */

const GM_SECRET_RE = /<gm-secret\b[^>]*>[\s\S]*?<\/gm-secret>/gi;
const WIKILINK_RE = /data-wiki-link="([^"]*)"/g;

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

/** Résolution insensible à la casse d'un titre vers un id d'entité. */
export function resolveLinkTarget(
  title: string,
  entities: ReadonlyArray<{ id: string; title: string }>,
): string | undefined {
  const needle = title.toLocaleLowerCase("fr");
  return entities.find((e) => e.title.toLocaleLowerCase("fr") === needle)?.id;
}
