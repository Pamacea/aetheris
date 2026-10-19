"use client";

import type { WikiNoteMeta, WikiTemplateMeta } from "./wiki-app-types";

/** Formulaire « Nouvelle note » (piloté par l'état du panneau latéral). */
export function WikiAppNewForm({
  campaignId,
  localNotes,
  templates,
  newTitle,
  setNewTitle,
  newFolder,
  setNewFolder,
  newTemplateId,
  setNewTemplateId,
  onSubmit,
}: {
  campaignId: string;
  localNotes: WikiNoteMeta[];
  templates: WikiTemplateMeta[];
  newTitle: string;
  setNewTitle: (v: string) => void;
  newFolder: string;
  setNewFolder: (v: string) => void;
  newTemplateId: string;
  setNewTemplateId: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const folders = [
    ...new Set(localNotes.map((n) => n.folder).filter((f): f is string => !!f)),
  ].sort();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <input
        className="input py-1 text-sm"
        name="note-titre"
        placeholder="Titre de la note"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        autoFocus
        required
      />
      <input
        className="input py-1 text-sm"
        name="note-dossier"
        placeholder="Dossier (optionnel)"
        value={newFolder}
        onChange={(e) => setNewFolder(e.target.value)}
        list={`${campaignId}-folders`}
      />
      <datalist id={`${campaignId}-folders`}>
        {folders.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <select
        className="input py-1 text-sm"
        name="note-template"
        value={newTemplateId}
        onChange={(e) => setNewTemplateId(e.target.value)}
      >
        <option value="">Note libre (sans template)</option>
        {[...new Set(templates.map((t) => t.category ?? ""))]
          .sort((a, b) => a.localeCompare(b, "fr"))
          .map((cat) => (
            <optgroup key={cat || "__none"} label={cat || "Sans catégorie"}>
              {templates
                .filter((t) => (t.category ?? "") === cat)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </optgroup>
          ))}
      </select>
      <button type="submit" className="btn btn-primary py-1 text-xs">
        Créer
      </button>
    </form>
  );
}
