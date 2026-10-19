"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteWikiEntry, updateWikiEntry } from "./actions";
import { ShareButton } from "./share-button";
import type { SaveStatus } from "./autosave";
import type { WikiActiveEntry, WikiEntryMeta } from "./types";

/** En-tête de l'entrée : titre, statut d'enregistrement, métadonnées,
 *  historique des versions, partage public et suppression. */
export function NoteHeader({
  active,
  campaignId,
  isGM,
  status,
  savedAt,
  setLocalEntries,
  onHistory,
}: {
  active: WikiActiveEntry;
  campaignId: string;
  isGM: boolean;
  status: SaveStatus;
  savedAt: string | null;
  setLocalEntries: React.Dispatch<React.SetStateAction<WikiEntryMeta[]>>;
  onHistory: () => void;
}) {
  const router = useRouter();
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaFolder, setMetaFolder] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    if (!metaTitle.trim()) return;
    const res = await updateWikiEntry(campaignId, active.id, {
      title: metaTitle.trim(),
      folder: metaFolder.trim() ? metaFolder.trim() : null,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setMetaOpen(false);
    setLocalEntries((prev) =>
      prev.map((n) =>
        n.id === active.id
          ? { ...n, title: metaTitle.trim(), folder: metaFolder.trim() || null }
          : n,
      ),
    );
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer « ${active.title} » ? Cette action est définitive.`)) return;
    const res = await deleteWikiEntry(campaignId, active.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLocalEntries((prev) => prev.filter((n) => n.id !== active.id));
    // Retour à la racine du wiki : la page se re-sélectionne sur la 1re entrée.
    router.push(`/campaign/${campaignId}/wiki`);
    router.refresh();
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
        {isGM && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn px-2 py-1 text-xs"
              onClick={() => {
                setMetaTitle(active.title);
                setMetaFolder(active.folder ?? "");
                setError(null);
                setMetaOpen((o) => !o);
              }}
            >
              Modifier
            </button>
            <button type="button" className="btn px-2 py-1 text-xs" onClick={onHistory}>
              Historique
            </button>
            <ShareButton campaignId={campaignId} entityId={active.id} slug={active.shareSlug} />
            <button
              type="button"
              className="btn px-2 py-1 text-xs text-destructive"
              onClick={() => void handleDelete()}
            >
              Supprimer
            </button>
          </div>
        )}
      </header>

      {metaOpen && (
        <form
          onSubmit={(e) => void handleMetaSave(e)}
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
              list={`${campaignId}-wiki-folders`}
            />
          </label>
          <button type="submit" className="btn btn-primary px-3 py-1 text-xs">
            Enregistrer
          </button>
          {error && <span className="pb-1 text-xs text-destructive">{error}</span>}
        </form>
      )}
      {error && !metaOpen && (
        <p className="border-b border-border bg-card px-5 py-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
