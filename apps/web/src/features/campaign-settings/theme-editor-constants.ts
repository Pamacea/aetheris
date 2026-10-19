type Preset = { id: string; name: string; css: string };

/** Presets intégrés — surcharge des variables de thème (voir globals.css). */
export const THEME_PRESETS: Preset[] = [
  { id: "pandemonium", name: "Pandémonium", css: "" },
  {
    id: "parchemin",
    name: "Parchemin",
    css: `:root {
  color-scheme: light;
  --background: #f3e9d2;
  --foreground: #2a1f14;
  --muted: #7a6a52;
  --card: #efe2c8;
  --card-hover: #e6d5b6;
  --border: #b8a07a;
  --accent: #9c2f16;
  --accent-2: #7a4a12;
  --accent-foreground: #fdf6e6;
  --destructive: #a4231b;
}`,
  },
  {
    id: "abyss",
    name: "Abyss",
    css: `:root {
  color-scheme: dark;
  --background: #05070d;
  --foreground: #c8d6e8;
  --muted: #6b7c96;
  --card: #0a0f1a;
  --card-hover: #101728;
  --border: #24304a;
  --accent: #3d7bff;
  --accent-2: #1e3f8f;
  --accent-foreground: #eaf1ff;
  --destructive: #c03a4a;
}`,
  },
];

export const CSS_PLACEHOLDER = `/* Variables publiques du thème Pandémonium (globals.css) :
   --background, --foreground, --muted, --card, --card-hover, --border,
   --accent, --accent-2, --accent-foreground, --destructive, --font-display… */
:root {
  --accent: #dd5c33;
  --card: #14100c;
}`;

export const JS_PLACEHOLDER = `// S'exécute uniquement dans l'iframe ci-dessous.
// Console vers la page hôte :
// parent.postMessage({ type: "aetheris:log", text: "salut" }, "*");`;

/** Miroir des tokens du design system, injecté avant le CSS utilisateur. */
const PREVIEW_BASE = `:root {
  --background: #0b0907;
  --foreground: #e7dcc6;
  --muted: #9a8b74;
  --card: #14100c;
  --card-hover: #1b150f;
  --border: #4b3a2a;
  --accent: #dd5c33;
  --accent-2: #8a3d10;
  --accent-foreground: #f2e7d3;
  --destructive: #e04840;
}
body {
  margin: 0;
  padding: 1.25rem;
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, sans-serif;
}
h1 { font-size: 1.05rem; margin: 0 0 0.75rem; }
.panel {
  background: var(--card);
  border: 1px solid var(--border);
  padding: 0.85rem;
  margin-bottom: 0.75rem;
}
.muted { color: var(--muted); font-size: 0.8rem; }
button {
  background: var(--accent);
  color: var(--accent-foreground);
  border: 1px solid var(--accent-2);
  padding: 0.45rem 0.9rem;
  font: inherit;
  cursor: pointer;
}
button:hover { background: var(--accent-2); }`;

export function buildSrcDoc(css: string, js: string): string {
  // JS inséré tel quel : une fermeture </script> prématurée ne casse que
  // cet aperçu (origine opaque, sandboxé), jamais la page hôte.
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><style>${PREVIEW_BASE}
${css}</style></head>
<body>
<h1>Aperçu du thème</h1>
<div class="panel">
  <strong>Carte d'exemple</strong>
  <p class="muted">Panneau, bouton et variables du thème Pandémonium.</p>
  <button type="button">Bouton primaire</button>
</div>
<script>
window.onerror = function (msg) {
  parent.postMessage({ type: "aetheris:log", text: "Erreur : " + msg }, "*");
};
</script>
<script>
try {
${js}
} catch (e) {
  parent.postMessage({ type: "aetheris:log", text: "Erreur : " + e.message }, "*");
}
</script>
</body>
</html>`;
}
