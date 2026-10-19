"use client";

import { useRef } from "react";
import { THEME_PRESETS } from "./theme-editor-constants";

export function ThemeEditorToolbar({
  isGM,
  pending,
  css,
  js,
  onPickPreset,
  onSave,
  onImport,
}: {
  isGM: boolean;
  pending: boolean;
  css: string;
  js: string;
  onPickPreset: (css: string) => void;
  onSave: () => void;
  onImport: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function exportTheme() {
    const blob = new Blob(
      [
        JSON.stringify(
          { format: "aetheris-theme", version: 1, name: "Thème Aetheris", css, js },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "theme-aetheris.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[0.65rem] tracking-widest text-muted uppercase">Presets</span>
      {THEME_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={!isGM || pending}
          onClick={() => onPickPreset(p.css)}
          className="border border-border px-3 py-1.5 text-xs tracking-widest text-muted uppercase transition-colors hover:border-accent/60 hover:text-foreground disabled:opacity-50"
        >
          {p.name}
        </button>
      ))}
      <span className="grow" />
      <button type="button" onClick={exportTheme} className="btn px-3 py-1.5 text-xs">
        Télécharger JSON
      </button>
      <input
        ref={fileRef}
        type="file"
        name="importation-theme"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={!isGM}
        onClick={() => fileRef.current?.click()}
        className="btn px-3 py-1.5 text-xs disabled:opacity-50"
      >
        Importer JSON
      </button>
      {isGM && (
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="btn btn-primary px-4 py-1.5 text-xs"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      )}
    </div>
  );
}
