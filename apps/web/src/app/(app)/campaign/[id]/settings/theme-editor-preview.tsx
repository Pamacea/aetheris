"use client";

import { useEffect, useMemo, useState } from "react";
import { buildSrcDoc } from "./theme-editor-constants";

export function ThemeEditorPreview({ css, js }: { css: string; js: string }) {
  // Aperçu décalé : évite de recharger l'iframe à chaque frappe.
  const [previewCss, setPreviewCss] = useState(css);
  const [previewJs, setPreviewJs] = useState(js);
  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPreviewCss(css);
      setPreviewJs(js);
      setLogs([]);
    }, 500);
    return () => clearTimeout(t);
  }, [css, js]);

  const srcDoc = useMemo(() => buildSrcDoc(previewCss, previewJs), [previewCss, previewJs]);

  useEffect(() => {
    function onMessage(e: MessageEvent<unknown>) {
      const data = e.data;
      if (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        data.type === "aetheris:log" &&
        "text" in data
      ) {
        setLogs((prev) => [...prev.slice(-49), String(data.text)]);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[0.65rem] tracking-widest text-muted uppercase">
          <span className="mark-tri" aria-hidden />
          Aperçu sandboxé
        </h2>
        <span className="font-mono text-[0.65rem] text-muted">
          sandbox=&quot;allow-scripts&quot; — origine opaque, zéro accès parent
        </span>
      </div>
      <iframe
        title="Aperçu du thème"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        className="h-72 w-full border border-border"
      />
      {logs.length > 0 && (
        <ul className="max-h-28 overflow-y-auto border border-border bg-background p-2 font-mono text-[0.7rem] text-muted">
          {logs.map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
