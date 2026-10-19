"use client";

import Link from "next/link";
import { useState } from "react";
import { createWikiNote } from "./actions";
import { WikiAppNewForm } from "./wiki-app-new-form";
import { fold } from "./wiki-app-utils";
import type { WikiActiveNote, WikiNoteMeta, WikiTemplateMeta } from "./wiki-app-types";

/** Panneau gauche : recherche, création, dossiers + notes. */
export function WikiAppSidebar({
  campaignId,
  localNotes,
  templates,
  isGM,
  active,
  newOpen,
  setNewOpen,
  selectNote,
}: {
  campaignId: string;
  localNotes: WikiNoteMeta[];
  templates: WikiTemplateMeta[];
  isGM: boolean;
  active: WikiActiveNote | null;
  newOpen: boolean;
  setNewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectNote: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [newTemplateId, setNewTemplateId] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await createWikiNote(campaignId, {
      title: newTitle.trim(),
      ...(newFolder.trim() ? { folder: newFolder.trim() } : {}),
      ...(newTemplateId ? { templateId: newTemplateId } : {}),
    });
    if (res.ok) {
      setNewOpen(false);
      setNewTitle("");
      setNewFolder("");
      setNewTemplateId("");
      await selectNote(res.id);
    }
  }

  const visible = localNotes
    .filter((n) => (query ? fold(n.title).includes(fold(query)) : true))
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));
  const grouped = new Map<string, WikiNoteMeta[]>();
  for (const n of visible) {
    const key = n.folder ?? "";
    const bucket = grouped.get(key);
    if (bucket) bucket.push(n);
    else grouped.set(key, [n]);
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-card">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.65rem] tracking-[0.2em] text-muted uppercase">
            Notes ({localNotes.length})
          </span>
          <button
            type="button"
            className="btn px-2 py-0.5 text-xs text-accent"
            onClick={() => setNewOpen((o) => !o)}
          >
            + Nouvelle
          </button>
        </div>
        <input
          className="input py-1 text-sm"
          name="recherche-notes"
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {newOpen && (
          <WikiAppNewForm
            campaignId={campaignId}
            localNotes={localNotes}
            templates={templates}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newFolder={newFolder}
            setNewFolder={setNewFolder}
            newTemplateId={newTemplateId}
            setNewTemplateId={setNewTemplateId}
            onSubmit={handleCreate}
          />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {isGM && (
          <Link
            href={`/campaign/${campaignId}/wiki/templates`}
            className="mb-3 block border-l-2 border-transparent px-2 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground"
          >
            Modèles ({templates.length})
          </Link>
        )}
        {grouped.size === 0 && <p className="p-3 text-xs text-muted">Aucune note.</p>}
        {[...grouped.entries()].map(([folder, items]) => (
          <div key={folder || "__root"} className="mb-3">
            <p className="px-2 py-1 text-[0.6rem] tracking-widest text-muted uppercase">
              {folder || "Racine"}
            </p>
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void selectNote(n.id)}
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
