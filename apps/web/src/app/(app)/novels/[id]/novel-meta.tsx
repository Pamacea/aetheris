"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { CycleStatus } from "@/components/cycle-status";
import { updateNovel } from "@/features/novels/actions";

/** Cycle du statut du roman : un clic = état suivant. */
const NOVEL_STATES = [
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
  actions,
}: {
  novelId: string;
  title: string;
  synopsis: string | null;
  status: string;
  /** Actions supplémentaires alignées avec statut/export (ex. partage). */
  actions?: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
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
          // .input (non-layeré) écrase text-2xl : taille du titre en inline.
          className="input min-w-0 flex-1 font-medium tracking-wide"
          style={{ fontSize: "1.5rem" }}
        />
        {/* self-stretch : le bouton prend exactement la hauteur de l'input
            Titre sur la même ligne (alignement sans hauteur en dur). */}
        <CycleStatus
          states={NOVEL_STATES}
          current={status}
          onCycle={(next) => save({ status: next as "draft" | "writing" | "published" })}
          legend="Statut du roman"
          className="self-stretch"
        />
        <Link
          href={`/novels/${novelId}/print`}
          target="_blank"
          rel="noopener"
          className="btn self-stretch px-3 text-xs"
        >
          Export
        </Link>
        {actions}
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
            if (s !== (synopsis ?? "")) save({ synopsis: s || null });
          }}
          rows={2}
          maxLength={5000}
          aria-label="Synopsis"
          className="input resize-y text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingSynopsis(true)}
          className="self-start px-0 py-0 text-left text-sm text-muted underline-offset-2 hover:text-foreground hover:underline focus-visible:text-foreground"
        >
          {currentSynopsis || "+ Ajouter un synopsis"}
        </button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
