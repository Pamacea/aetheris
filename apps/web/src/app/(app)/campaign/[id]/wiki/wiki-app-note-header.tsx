"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateWikiNote } from "./actions";
import type { SaveStatus } from "./wiki-app-autosave";
import type { WikiActiveNote, WikiNoteMeta } from "./wiki-app-types";

/** En-tête de note (titre, statut d'enregistrement) + édition des métadonnées. */
export function WikiNoteHeader({
  active,
  campaignId,
  isGM,
  status,
  savedAt,
  setLocalNotes,
  onHistory,
}: {
  active: WikiActiveNote;
  campaignId: string;
  isGM: boolean;
  status: SaveStatus;
  savedAt: string | null;
  setLocalNotes: React.Dispatch<React.SetStateAction<WikiNoteMeta[]>>;
  onHistory: () => void;
}) {
  const router = useRouter();
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaFolder, setMetaFolder] = useState("");

  const statusLabel =
    status === "saving"
      ? "Enregistrement…"
      : status === "pending"
        ? "Modifications non enregistrées"
        : status === "error"
          ? "Erreur d’enregistrement"
          : savedAt
            ? `Enregistré à ${savedAt}`
            : "À jour";

  async function handleMetaSave(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !metaTitle.trim()) return;
    const res = await updateWikiNote(campaignId, active.id, {
      title: metaTitle.trim(),
      folder: metaFolder.trim() ? metaFolder.trim() : null,
    });
    if (res.ok) {
      setMetaOpen(false);
      setLocalNotes((prev) =>
        prev.map((n) =>
          n.id === active.id
            ? { ...n, title: metaTitle.trim(), folder: metaFolder.trim() || null }
            : n,
        ),
      );
      router.refresh();
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-medium" title={active.title}>
            {active.title}
          </h1>
          <p className="text-[0.65rem] tracking-widest text-muted uppercase">{statusLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {isGM && (
            <>
              <button
                type="button"
                className="btn px-2 py-1 text-xs"
                onClick={() => {
                  setMetaTitle(active.title);
                  setMetaFolder(active.folder ?? "");
                  setMetaOpen((o) => !o);
                }}
              >
                Modifier
              </button>
              <button type="button" className="btn px-2 py-1 text-xs" onClick={onHistory}>
                Historique
              </button>
            </>
          )}
        </div>
      </header>

      {metaOpen && (
        <form
          onSubmit={handleMetaSave}
          className="flex flex-wrap items-end gap-2 border-b border-border bg-card px-5 py-2"
        >
          <label className="flex flex-col gap-1 text-[0.65rem] tracking-widest text-muted uppercase">
            Titre
            <input
              className="input py-1 text-sm"
              name="meta-titre"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-[0.65rem] tracking-widest text-muted uppercase">
            Dossier
            <input
              className="input py-1 text-sm"
              name="meta-dossier"
              value={metaFolder}
              onChange={(e) => setMetaFolder(e.target.value)}
              placeholder="Racine"
              list={`${campaignId}-folders`}
            />
          </label>
          <button type="submit" className="btn btn-primary px-3 py-1 text-xs">
            Enregistrer
          </button>
        </form>
      )}
    </>
  );
}
