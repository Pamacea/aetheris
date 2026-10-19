"use client";

import { useState, useTransition } from "react";
import { sanitizeCss, themeFileSchema } from "@aetheris/shared";
import { saveCampaignTheme } from "./actions";
import { CSS_PLACEHOLDER, JS_PLACEHOLDER } from "./theme-editor-constants";
import { ThemeEditorPreview } from "./theme-editor-preview";
import { ThemeEditorToolbar } from "./theme-editor-toolbar";

/**
 * Éditeur de thème par campagne (MJ uniquement — la page ne le rend pas aux
 * joueurs, et l'action revérifie le rôle côté serveur) : deux zones de code
 * (CSS/JS), presets, export/import JSON, aperçu dans un iframe sandboxé
 * `allow-scripts` SANS `allow-same-origin` (origine opaque : le JS custom ne
 * peut ni lire ni écrire le DOM parent, ni localStorage/cookies).
 */

type Status = { kind: "ok" } | { kind: "err"; msg: string };

export function ThemeEditor({
  campaignId,
  initialCss,
  initialJs,
}: {
  campaignId: string;
  initialCss: string;
  initialJs: string;
}) {
  const [css, setCss] = useState(initialCss);
  const [js, setJs] = useState(initialJs);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status | null>(null);

  function save() {
    setStatus(null);
    startTransition(async () => {
      const res = await saveCampaignTheme(campaignId, { css, js });
      setStatus(res.ok ? { kind: "ok" } : { kind: "err", msg: res.error });
    });
  }

  async function importTheme(file: File) {
    setStatus(null);
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setStatus({ kind: "err", msg: "Fichier JSON illisible." });
      return;
    }
    const parsed = themeFileSchema.safeParse(json);
    if (!parsed.success) {
      setStatus({
        kind: "err",
        msg: "Fichier invalide (attendu : aetheris-theme version 1).",
      });
      return;
    }
    const clean = sanitizeCss(parsed.data.css);
    if (!clean.ok) {
      setStatus({ kind: "err", msg: clean.error });
      return;
    }
    setCss(clean.css);
    setJs(parsed.data.js);
    setStatus({ kind: "ok" });
  }

  return (
    <div className="flex flex-col gap-6">
      <ThemeEditorToolbar
        pending={pending}
        css={css}
        js={js}
        onPickPreset={(c) => {
          setCss(c);
          setStatus(null);
        }}
        onSave={save}
        onImport={importTheme}
      />
      {status?.kind === "ok" && <p className="text-xs text-accent">Thème enregistré ✓</p>}
      {status?.kind === "err" && <p className="text-xs text-destructive">{status.msg}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="panel flex flex-col gap-2 p-4">
          <label
            htmlFor="theme-css"
            className="text-[0.65rem] tracking-widest text-muted uppercase"
          >
            CSS personnalisé (customStyles)
          </label>
          <textarea
            id="theme-css"
            value={css}
            spellCheck={false}
            placeholder={CSS_PLACEHOLDER}
            onChange={(e) => {
              setCss(e.target.value);
              setStatus(null);
            }}
            className="input min-h-72 resize-y font-mono text-xs leading-relaxed"
          />
          <p className="text-[0.7rem] text-muted">
            Sanitisé puis injecté sur toutes les pages de la campagne (ThemeInjector).
          </p>
        </section>
        <section className="panel flex flex-col gap-2 p-4">
          <label htmlFor="theme-js" className="text-[0.65rem] tracking-widest text-muted uppercase">
            JS personnalisé — bac à sable (customScript)
          </label>
          <textarea
            id="theme-js"
            value={js}
            spellCheck={false}
            placeholder={JS_PLACEHOLDER}
            onChange={(e) => {
              setJs(e.target.value);
              setStatus(null);
            }}
            className="input min-h-72 resize-y font-mono text-xs leading-relaxed"
          />
          <p className="text-[0.7rem] text-muted">
            Jamais exécuté dans la page hôte — uniquement dans l&apos;iframe ci-dessous. Console :{" "}
            <code>{`parent.postMessage({ type: "aetheris:log", text: "…" }, "*")`}</code>
          </p>
        </section>
      </div>

      <ThemeEditorPreview css={css} js={js} />
    </div>
  );
}
