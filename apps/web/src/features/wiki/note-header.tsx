"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withEmbed } from "@/components/campaigns/embed-mode";
import { EyeIcon, EyeOffIcon, HistoryIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { deleteWikiEntry, updateWikiEntry } from "./actions";
import { BlocksPalette } from "./blocks-palette";
import type { BlockPayload } from "./block-defs";
import { ShareButton } from "./share-button";
import type { SaveStatus } from "./autosave";
import type { WikiActiveEntry, WikiEntryMeta } from "./types";

const TOOLBAR_BUTTON =
  "inline-flex h-8 items-center gap-1.5 border border-border bg-card px-2.5 text-xs text-foreground transition hover:border-accent/60 hover:bg-card-hover";

function Separator() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

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
  onInsert,
}: {
  active: WikiActiveEntry;
  campaignId: string;
  isGM: boolean;
  status: SaveStatus;
  savedAt: string | null;
  setLocalEntries: React.Dispatch<React.SetStateAction<WikiEntryMeta[]>>;
  onHistory: () => void;
  /** Insère un bloc dans l'éditeur de la note (absent pour une fiche). */
  onInsert?: (payload: BlockPayload) => void;
}) {
  const router = useRouter();
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaFolder, setMetaFolder] = useState("");
  // Re-monté par une clé sur `active.id` (wiki-app) : l'état suit la note.
  const [gmOnly, setGmOnly] = useState(active.gmOnly);
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

  async function handleGmOnly() {
    const next = !gmOnly;
    const res = await updateWikiEntry(campaignId, active.id, { gmOnly: next });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setGmOnly(next);
    setLocalEntries((prev) => prev.map((n) => (n.id === active.id ? { ...n, gmOnly: next } : n)));
    // Le partage est révoqué côté serveur : on resynchronise l'en-tête.
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
    router.push(withEmbed(`/campaign/${campaignId}/wiki`));
    router.refresh();
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-lg font-medium" title={active.title}>
            <span className="truncate">{active.title}</span>
            {gmOnly && (
              <span className="shrink-0 border border-accent/50 bg-accent/10 px-1.5 py-0.5 text-[0.55rem] tracking-widest text-accent uppercase">
                MJ
              </span>
            )}
          </h1>
          <p className="text-[0.65rem] tracking-widest text-muted uppercase">{statusLabel}</p>
        </div>
        {isGM && (
          <div
            className="flex flex-wrap items-center gap-1"
            role="toolbar"
            aria-label="Actions de l’entrée"
          >
            {onInsert && (
              <>
                <BlocksPalette className={TOOLBAR_BUTTON} onInsert={onInsert} />
                <Separator />
              </>
            )}
            <button
              type="button"
              className={TOOLBAR_BUTTON}
              title="Renommer ou déplacer l’entrée"
              aria-expanded={metaOpen}
              aria-controls="wiki-note-meta"
              onClick={() => {
                setMetaTitle(active.title);
                setMetaFolder(active.folder ?? "");
                setError(null);
                setMetaOpen((o) => !o);
              }}
            >
              <PencilIcon />
              <span className="hidden sm:inline">Détails</span>
            </button>
            <Separator />
            <button
              type="button"
              className={`${TOOLBAR_BUTTON} ${gmOnly ? "border-accent/60 text-accent" : ""}`}
              aria-pressed={gmOnly}
              title={
                gmOnly
                  ? "Note secrète : visible uniquement par le MJ"
                  : "Rendre la note secrète (MJ uniquement)"
              }
              onClick={() => void handleGmOnly()}
            >
              {gmOnly ? <EyeOffIcon /> : <EyeIcon />}
              <span className="hidden sm:inline">{gmOnly ? "Note MJ" : "Joueurs"}</span>
            </button>
            <Separator />
            <button
              type="button"
              className={TOOLBAR_BUTTON}
              title="Historique des versions"
              onClick={onHistory}
            >
              <HistoryIcon />
              <span className="hidden sm:inline">Historique</span>
            </button>
            {!gmOnly && (
              <ShareButton campaignId={campaignId} entityId={active.id} slug={active.shareSlug} />
            )}
            <Separator />
            <button
              type="button"
              className={`${TOOLBAR_BUTTON} text-destructive hover:border-destructive/60`}
              title="Supprimer l’entrée"
              onClick={() => void handleDelete()}
            >
              <TrashIcon />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
          </div>
        )}
      </header>

      {metaOpen && (
        <form
          id="wiki-note-meta"
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
