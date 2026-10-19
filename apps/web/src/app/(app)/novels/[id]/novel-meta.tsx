"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateNovel } from "../actions";

const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon" },
  { value: "writing", label: "En écriture" },
  { value: "published", label: "Publié" },
] as const;

/** Métadonnées du roman éditables par l'auteur : titre, synopsis, statut. */
export function NovelMeta({
  novelId,
  title,
  synopsis,
  status,
}: {
  novelId: string;
  title: string;
  synopsis: string | null;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentSynopsis, setCurrentSynopsis] = useState(synopsis ?? "");
  const [editingSynopsis, setEditingSynopsis] = useState(false);

  function save(patch: {
    title?: string;
    synopsis?: string | null;
    status?: "draft" | "writing" | "published";
  }) {
    setError(null);
    startTransition(async () => {
      const res = await updateNovel(novelId, patch);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          name="roman-titre"
          value={currentTitle}
          onChange={(e) => setCurrentTitle(e.target.value)}
          onBlur={() => {
            const t = currentTitle.trim();
            if (t && t !== title) save({ title: t });
            else setCurrentTitle(title);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          aria-label="Titre du roman"
          maxLength={200}
          className="input min-w-0 flex-1 py-1 text-2xl font-medium tracking-wide"
        />
        <select
          name="roman-statut"
          value={status}
          onChange={(e) =>
            save({
              status: e.target.value as "draft" | "writing" | "published",
            })
          }
          disabled={pending}
          aria-label="Statut du roman"
          className="input w-auto py-1 text-xs"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {editingSynopsis ? (
        <textarea
          autoFocus
          name="roman-synopsis"
          value={currentSynopsis}
          onChange={(e) => setCurrentSynopsis(e.target.value)}
          onBlur={() => {
            setEditingSynopsis(false);
            const s = currentSynopsis.trim();
            if (s !== (synopsis ?? "")) {
              save({ synopsis: s || null });
            }
          }}
          rows={4}
          maxLength={5000}
          aria-label="Synopsis"
          className="input resize-y text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingSynopsis(true)}
          className="min-h-6 border border-transparent px-1 py-0.5 text-left text-sm text-muted hover:border-border hover:text-foreground"
        >
          {currentSynopsis || "+ Ajouter un synopsis"}
        </button>
      )}

      {error && (
        <p className="border border-destructive/60 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
