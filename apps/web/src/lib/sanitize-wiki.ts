import sanitizeHtml from "sanitize-html";

/**
 * Allowlist du HTML Tiptap avant stockage : neutralise script, handlers
 * d'événements et URLs `javascript:` sans casser les nœuds wiki
 * (`gm-secret`, blocs `aetheris-block` / `dice-block` / `wiki-table`,
 * wikilinks, classes de rendu).
 */
export function sanitizeWikiHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "gm-secret",
      "aetheris-block",
      "dice-block",
      "wiki-table",
    ]),
    allowedAttributes: {
      a: ["href", "title", "class", "data-wiki-link"],
      "aetheris-block": ["data-kind", "data-label", "data-value", "data-size"],
      "dice-block": ["data-label", "data-expr"],
      "wiki-table": ["data-rows"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
