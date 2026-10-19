/**
 * Blocs du wiki → HTML lisible pour la lecture publique (`/shared/[slug]`).
 *
 * Dans l'éditeur, les blocs sont des éléments atomiques vides
 * (`<aetheris-block>`, `<dice-block>`, `<wiki-table>`) rendus par des vues
 * React. Hors éditeur (partage public, copie) il faut donc reconstruire un
 * HTML visible — après `stripGmSecrets` + `sanitizeWikiHtml`, le texte
 * injecté ici est entièrement échappé par nos soins.
 */

function decodeAttr(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Lecture d'un attribut `name="…"` dans la chaîne brute d'un tag ouvrant. */
function attr(attrs: string, name: string): string {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return match ? decodeAttr(match[1] ?? "") : "";
}

/** Cellules d'un tableau : JSON dans `data-rows` (raté → tableau vide). */
export function parseRows(raw: string): string[][] {
  try {
    const rows = JSON.parse(raw) as unknown;
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r): r is unknown[] => Array.isArray(r))
      .map((r) => r.map((c) => (typeof c === "string" ? c : String(c ?? ""))));
  } catch {
    return [];
  }
}

function renderTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  const head = rows[0] ?? [];
  const body = rows.slice(1);
  const th = head.map((c) => `<th>${esc(c)}</th>`).join("");
  const tr = body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  return `<table class="wiki-tbl"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

/**
 * Remplace les blocs atomiques par leur équivalent lisible.
 * Ordre imposé : sanitisation AVANT (les attributs data-* sont autorisés),
 * transformation ICI en dernier (texte échappé, structure générée).
 */
export function blocksToReadableHtml(html: string): string {
  return (
    html
      .replace(/<aetheris-block\b([^>]*?)(?:\/)?>/g, (_m, attrs: string) => {
        const label = attr(attrs, "data-label");
        const value = attr(attrs, "data-value");
        if (!label && !value) return "";
        const inner = value
          ? `<strong>${esc(label)}</strong> : ${esc(value)}`
          : `<strong>${esc(value || label)}</strong>`;
        return `<p class="wiki-block">${inner}</p>`;
      })
      .replace(/<dice-block\b([^>]*?)(?:\/)?>/g, (_m, attrs: string) => {
        const label = attr(attrs, "data-label") || "Jet";
        const expr = attr(attrs, "data-expr");
        return `<p class="wiki-block"><strong>${esc(label)}</strong> : <code>${esc(expr)}</code></p>`;
      })
      .replace(/<wiki-table\b([^>]*?)(?:\/)?>/g, (_m, attrs: string) =>
        renderTable(parseRows(attr(attrs, "data-rows"))),
      )
      // Fermetures orphelines des éléments atomiques.
      .replace(/<\/(?:aetheris-block|dice-block|wiki-table)>/g, "")
  );
}
