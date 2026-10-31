"use client";

import { useState } from "react";
import { CollapsibleSidePanel, usePersistedCollapse } from "@/components/collapsible-side-panel";
import { createWikiEntry } from "./actions";
import { noteDragStart } from "./templates/note-drop";
import { fold } from "@/lib/text";
import type { WikiActiveEntry, WikiEntryMeta, WikiTemplateMeta } from "./types";

/**
 * Panneau gauche (pattern « entrées ») : recherche, création
 * (avec choix d'un template), dossiers + liste des entrées du wiki.
 */
export function EntriesPanel({
  campaignId,
  entries,
  templates,
  isGM,
  active,
  newOpen,
  setNewOpen,
  selectEntry,
}: {
  campaignId: string;
  entries: WikiEntryMeta[];
  templates: WikiTemplateMeta[];
  isGM: boolean;
  active: WikiActiveEntry | null;
  newOpen: boolean;
  setNewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectEntry: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [collapsed, toggleCollapsed] = usePersistedCollapse("aetheris:wiki:entries-collapsed");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await createWikiEntry(campaignId, {
      title: title.trim(),
      ...(folder.trim() ? { folder: folder.trim() } : {}),
      ...(templateId ? { templateId } : {}),
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setNewOpen(false);
    setTitle("");
    setFolder("");
    setTemplateId("");
    await selectEntry(res.id);
  }

  const visible = entries
    .filter((n) => (query ? fold(n.title).includes(fold(query)) : true))
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));
  const grouped = new Map<string, WikiEntryMeta[]>();
  for (const n of visible) {
    const key = n.folder ?? "";
    const bucket = grouped.get(key);
    if (bucket) bucket.push(n);
    else grouped.set(key, [n]);
  }
  const folders = [...new Set(entries.map((n) => n.folder).filter((f): f is string => !!f))].sort();

  return (
    <CollapsibleSidePanel
      id="panel-entries"
      label={`Entrées (${entries.length})`}
      side="left"
      collapsed={collapsed}
      onToggle={toggleCollapsed}
      width="w-60"
    >
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <input
            className="input min-w-0 flex-1 py-1 text-sm"
            name="recherche-entrees"
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isGM && (
            <button
              type="button"
              className="btn shrink-0 px-2 py-1 text-xs text-accent"
              onClick={() => setNewOpen((o) => !o)}
            >
              + Nouvelle
            </button>
          )}
        </div>
        {newOpen && (
          <form onSubmit={(e) => void handleCreate(e)} className="flex flex-col gap-2">
            <input
              className="input py-1 text-sm"
              name="entree-titre"
              placeholder="Titre de l'entrée"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
            <input
              className="input py-1 text-sm"
              name="entree-dossier"
              placeholder="Dossier (optionnel)"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              list={`${campaignId}-wiki-folders`}
            />
            <datalist id={`${campaignId}-wiki-folders`}>
              {folders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <select
              className="input py-1 text-sm"
              name="entree-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
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
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button type="submit" className="btn btn-primary py-1 text-xs">
              Créer
            </button>
          </form>
        )}
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto p-2">
        {grouped.size === 0 && (
          <p className="p-3 text-xs text-muted">{query ? "Aucun résultat." : "Aucune entrée."}</p>
        )}
        {[...grouped.entries()].map(([key, items]) => (
          <div key={key || "__root"} className="mb-3">
            <p className="px-2 py-1 text-[0.6rem] tracking-widest text-muted uppercase">
              {key || "Racine"}
            </p>
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => noteDragStart(e, { id: n.id, title: n.title })}
                    title="Glisser dans une fiche"
                    onClick={() => void selectEntry(n.id)}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-card-hover ${
                      active?.id === n.id
                        ? "border-l-2 border-accent bg-card-hover text-foreground"
                        : "border-l-2 border-transparent text-muted"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{n.title}</span>
                    {n.gmOnly && (
                      <span className="shrink-0 text-[0.55rem] tracking-widest text-accent uppercase">
                        MJ
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </CollapsibleSidePanel>
  );
}
