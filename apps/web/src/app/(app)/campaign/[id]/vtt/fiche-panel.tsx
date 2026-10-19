"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { resolveLinkTarget } from "@/lib/wiki";
import { TemplateForm, type FormSaveStatus } from "../wiki/template-form";
import { getWikiFiche, type FichePayload } from "./actions";

const STATUS_LABEL: Record<FormSaveStatus, string> = {
  saving: "Enregistrement…",
  saved: "Enregistré ✓",
  error: "Erreur d’enregistrement",
};

/**
 * Panneau latéral « fiche du token » : rendu via le TemplateForm du wiki
 * (importé tel quel, logique non dupliquée). Navigation par les champs
 * « tag » : le panneau suit le lien sans quitter la table.
 */
export function FichePanel({
  campaignId,
  entityId,
  tokenName,
  onClose,
}: {
  campaignId: string;
  entityId: string;
  tokenName: string;
  onClose: () => void;
}) {
  const [navId, setNavId] = useState(entityId);
  const [fiche, setFiche] = useState<FichePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<FormSaveStatus>("saved");
  // Dérivé (initial = null) : évite un setState synchrone dans l'effet.
  const loading = !fiche && !error;

  useEffect(() => {
    let alive = true;
    getWikiFiche(campaignId, navId).then((res) => {
      if (!alive) return;
      if (res.ok) {
        setFiche(res.fiche);
        setError(null);
        setStatus("saved");
      } else {
        setFiche(null);
        setError(res.error);
      }
    });
    return () => {
      alive = false;
    };
  }, [campaignId, navId]);

  /** Wikilink [[Titre]] du corps rendu : ouvre la note cible dans le panneau. */
  const onContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a[data-wiki-link]");
    if (!anchor || !fiche) return;
    e.preventDefault();
    const title = anchor.getAttribute("data-wiki-link");
    // shortcut: titre non résolu → rien ne se passe (le wiki crée la note, pas le panneau).
    const target = title ? resolveLinkTarget(title, fiche.notes) : undefined;
    if (target) setNavId(target);
  };

  return (
    <aside
      className="absolute inset-y-0 right-0 z-20 flex w-[26rem] max-w-full cursor-default flex-col border-l border-border bg-card shadow-xl"
      aria-label="Fiche du token"
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="text-[0.65rem] tracking-widest text-muted uppercase">Fiche</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {fiche?.title ?? tokenName}
        </span>
        {loading && <span className="text-[0.65rem] text-muted">Chargement…</span>}
        {!loading && fiche && (
          <span
            className={`text-[0.65rem] ${status === "error" ? "text-destructive" : "text-muted"}`}
          >
            {STATUS_LABEL[status]}
          </span>
        )}
        <Link
          href={`/campaign/${campaignId}/wiki?note=${navId}`}
          className="text-xs text-accent hover:underline"
        >
          Wiki →
        </Link>
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          ✕
        </button>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {error && <p className="p-4 text-xs text-destructive">{error}</p>}
        {!error && fiche && fiche.schemaRaw === null && (
          <>
            {fiche.contentHtml && (
              <div
                className="wiki-prose px-4 pt-4"
                // Corps servi par le serveur (secrets MJ déjà stripGmSecrets pour les joueurs).
                dangerouslySetInnerHTML={{ __html: fiche.contentHtml }}
                onClick={onContentClick}
              />
            )}
            <p className="p-4 text-xs text-muted">
              Note libre sans template — ouvrez-la dans le wiki pour la modifier.
            </p>
          </>
        )}
        {!error && fiche && fiche.schemaRaw !== null && (
          <TemplateForm
            key={fiche.entityId}
            campaignId={campaignId}
            entityId={fiche.entityId}
            schemaRaw={fiche.schemaRaw}
            initialData={fiche.data}
            notes={fiche.notes}
            templates={fiche.templates}
            onStatus={setStatus}
            onNavigate={setNavId}
          />
        )}
      </div>
    </aside>
  );
}
