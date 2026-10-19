import sanitizeHtml from "sanitize-html";

/**
 * Allowlist du HTML Tiptap avant stockage : neutralise script, handlers
 * d'événements et URLs `javascript:` sans casser les nœuds wiki
 * (`gm-secret`, `aetheris-block`, wikilinks, classes de rendu).
 */
export function sanitizeWikiHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["gm-secret", "aetheris-block"]),
    allowedAttributes: {
      a: ["href", "title", "class", "data-wiki-link"],
      "aetheris-block": ["data-kind", "data-label", "data-value", "data-size"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
