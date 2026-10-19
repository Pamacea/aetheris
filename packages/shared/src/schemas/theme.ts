import { z } from "zod";

/** Taille max d'un code custom (CSS ou JS) par campagne. */
export const THEME_CODE_MAX = 100_000;

export const saveCampaignThemeSchema = z.object({
  css: z.string().max(THEME_CODE_MAX),
  js: z.string().max(THEME_CODE_MAX),
});
export type CampaignThemeInput = z.infer<typeof saveCampaignThemeSchema>;

/** Fichier de thème exporté/importé côté client (JSON). */
export const themeFileSchema = z.object({
  format: z.literal("aetheris-theme"),
  version: z.literal(1),
  name: z.string().min(1).max(80),
  css: z.string().max(THEME_CODE_MAX),
  js: z.string().max(THEME_CODE_MAX),
});
export type ThemeFile = z.infer<typeof themeFileSchema>;

export type SanitizeCssResult = { ok: true; css: string } | { ok: false; error: string };

function fail(error: string): SanitizeCssResult {
  return { ok: false, error };
}

const MAX_DECODE_PASSES = 5;

/**
 * Décode les échappements CSS (`\3c`, `\75 rl`…) jusqu'à stabilisation,
 * pour que la détection de motifs ne puisse pas être contournée.
 */
function decodeCssEscapes(input: string): string {
  let s = input;
  for (let i = 0; i < MAX_DECODE_PASSES; i++) {
    const next = s
      .replace(/\\([0-9a-fA-F]{1,6})[ \t\n]?/g, (_m, hex: string) => {
        const code = Number.parseInt(hex, 16);
        return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : "";
      })
      .replace(/\\([\s\S])/g, "$1");
    if (next === s) break;
    s = next;
  }
  return s;
}

/**
 * Sanitise un CSS custom de campagne avant injection dans le `<style>` du
 * DOM parent. Approche : blocklist sur une copie normalisée (commentaires
 * retirés, échappements décodés, casse ignorée) — le CSS d'origine est
 * renvoyé intact s'il est propre.
 *
 * Refuse : `@import`, `url()` vers l'extérieur (hors `data:image/` et `#`),
 * `expression()`, `behavior`, `-moz-binding`, `</style>`, `http(s)://` et
 * les URLs `//` résiduelles. Le JS custom n'est jamais sanitisé ici : il
 * ne s'exécute que dans un iframe sandboxé sans `allow-same-origin`.
 */
export function sanitizeCss(css: string): SanitizeCssResult {
  if (css.length > THEME_CODE_MAX) {
    return fail(`CSS trop volumineux (max ${THEME_CODE_MAX} caractères).`);
  }

  const probe = decodeCssEscapes(css.replace(/\/\*[\s\S]*?\*\//g, " ")).toLowerCase();

  if (/<\s*\/\s*style/.test(probe)) return fail("Balise </style> interdite dans le CSS.");
  if (/@import/.test(probe)) return fail("@import interdit (chargement externe).");
  if (/expression\s*\(/.test(probe)) return fail("expression() est interdit.");
  if (/behavior\s*:/.test(probe)) return fail("behavior: est interdit.");
  if (/-moz-binding/.test(probe)) return fail("-moz-binding est interdit.");

  // url(...) : seul le data-URI image ou le fragment local est accepté.
  let masked = probe;
  const urlRe = /\burl\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s]*))\s*\)/g;
  for (const m of probe.matchAll(urlRe)) {
    const value = m[1] ?? m[2] ?? m[3] ?? "";
    if (!value.startsWith("data:image/") && !value.startsWith("#")) {
      return fail("url() externe interdit : seuls data:image/ et # sont autorisés.");
    }
    masked = masked.replace(m[0], "url()");
  }

  if (/https?:/.test(masked)) return fail("URL http(s) interdite dans le CSS.");
  if (/\/\//.test(masked)) return fail("URL // interdite dans le CSS.");

  return { ok: true, css };
}
