"use client";

import { useState } from "react";
import { createWikiEntry } from "./actions";
import { fold } from "@/lib/text";
import type { WikiActiveEntry, WikiEntryMeta } from "./types";

/**
 * Panneau gauche (pattern « entrées ») : recherche, création,
 * dossiers + liste des entrées du wiki.
 */
export function EntriesPanel({
  campaignId,
  entries,
  isGM,
  active,
  newOpen,
  setNewOpen,
  selectEntry,
}: {
  campaignId: string;
  entries: WikiEntryMeta[];
  isGM: boolean;
  active: WikiActiveEntry | null;
  newOpen: boolean;
  setNewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectEntry: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await createWikiEntry(campaignId, {
      title: title.trim(),
      ...(folder.trim() ? { folder: folder.trim() } : {}),
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setNewOpen(false);
    setTitle("");
    setFolder("");
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
    <aside className="flex w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-card">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.65rem] tracking-[0.2em] text-muted uppercase">
            Entrées ({entries.length})
          </span>
          {isGM && (
            <button
              type="button"
              className="btn px-2 py-0.5 text-xs text-accent"
              onClick={() => setNewOpen((o) => !o)}
            >
              + Nouvelle
            </button>
          )}
        </div>
        <input
          className="input py-1 text-sm"
          name="recherche-entrees"
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button type="submit" className="btn btn-primary py-1 text-xs">
              Créer
            </button>
          </form>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
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
                    onClick={() => void selectEntry(n.id)}
                    className={`block w-full truncate px-2 py-1.5 text-left text-sm hover:bg-card-hover ${
                      active?.id === n.id
                        ? "border-l-2 border-accent bg-card-hover text-foreground"
                        : "border-l-2 border-transparent text-muted"
                    }`}
                  >
                    {n.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
