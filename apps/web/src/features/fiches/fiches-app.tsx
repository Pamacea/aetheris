"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { withEmbed } from "@/components/campaigns/embed-mode";
import { TemplateForm, type FormSaveStatus } from "@/features/wiki/templates/template-form";
import type { WikiEntryMeta, WikiTemplateMeta } from "@/features/wiki/types";
import type { FicheRow } from "./fiches";

const STATUS_LABEL: Record<FormSaveStatus, string> = {
  saving: "Enregistrement…",
  saved: "Enregistré ✓",
  error: "Erreur d’enregistrement",
};

interface FichesAppProps {
  campaignId: string;
  fiches: FicheRow[];
  /** Toutes les entrées de la campagne (champs « tag » du formulaire). */
  notes: WikiEntryMeta[];
  templates: WikiTemplateMeta[];
}

/**
 * Module Fiches joueurs : liste des entités liées à un template à gauche,
 * édition via le TemplateForm du wiki à droite (autosave non dupliquée).
 */
export function FichesApp({ campaignId, fiches, notes, templates }: FichesAppProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<FormSaveStatus>("saved");
  const [cat, setCat] = useState<string | null>(null);

  // Sous-onglets dynamiques : « Toutes » + les catégories de templates présentes.
  const categories = [
    ...new Set(fiches.map((f) => f.category).filter((c): c is string => c !== null)),
  ].sort((a, b) => a.localeCompare(b, "fr"));
  const visible = cat === null ? fiches : fiches.filter((f) => f.category === cat);
  const selected = visible.find((f) => f.id === selectedId) ?? null;

  // Champ « tag » : autre fiche → sélection locale, sinon ouverture dans le wiki.
  const onNavigate = (noteId: string) => {
    if (fiches.some((f) => f.id === noteId)) {
      setSelectedId(noteId);
      return;
    }
    router.push(withEmbed(`/campaign/${campaignId}/wiki?note=${noteId}`));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {categories.length > 0 && (
        <nav
          aria-label="Catégories de fiches"
          className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-1.5"
        >
          {[null, ...categories].map((c) => (
            <button
              key={c ?? "toutes"}
              type="button"
              onClick={() => setCat(c)}
              aria-current={cat === c ? "page" : undefined}
              className={
                cat === c
                  ? "btn btn-primary px-3 py-1.5 text-xs"
                  : "btn border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
              }
            >
              {c ?? "Toutes"}
            </button>
          ))}
        </nav>
      )}
      <div className="flex min-h-0 flex-1">
        <ul className="flex w-72 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-3">
          <li className="px-1 pb-1 text-[0.65rem] tracking-[0.2em] text-muted uppercase">
            Fiches ({visible.length})
          </li>
          {visible.length === 0 && (
            <p className="px-1 text-xs text-muted">
              {fiches.length === 0
                ? "Aucune fiche — créez un modèle dans le wiki, puis une entrée qui l’utilise."
                : "Aucune fiche dans cette catégorie."}
            </p>
          )}
          {visible.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(f.id);
                  setStatus("saved");
                }}
                aria-current={selectedId === f.id}
                className={`flex w-full flex-col gap-0.5 border px-3 py-2 text-left text-xs transition-colors ${
                  selectedId === f.id
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-transparent text-muted hover:border-border hover:text-foreground"
                }`}
              >
                <span className="truncate">{f.title}</span>
                <span className="text-[0.6rem] tracking-widest text-muted uppercase">
                  {f.templateName}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section className="flex min-w-0 flex-1 flex-col" aria-label="Édition de la fiche">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center">
              <p className="text-sm text-muted">
                {fiches.length === 0
                  ? "Aucune fiche à afficher pour cette campagne."
                  : visible.length === 0
                    ? "Aucune fiche dans cette catégorie."
                    : "Sélectionnez une fiche à gauche pour la remplir."}
              </p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-border px-4 py-2">
                <span className="text-[0.65rem] tracking-widest text-muted uppercase">Fiche</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {selected.title}
                </span>
                <span className="text-[0.65rem] tracking-widest text-muted uppercase">
                  {selected.templateName}
                </span>
                <span
                  className={`text-[0.65rem] ${status === "error" ? "text-destructive" : "text-muted"}`}
                >
                  {STATUS_LABEL[status]}
                </span>
                <Link
                  href={`/campaign/${campaignId}/wiki?note=${selected.id}`}
                  className="text-xs text-accent hover:underline"
                >
                  Wiki →
                </Link>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <TemplateForm
                  key={selected.id}
                  campaignId={campaignId}
                  entityId={selected.id}
                  schemaRaw={selected.schemaRaw}
                  initialData={selected.data}
                  notes={notes}
                  templates={templates}
                  onStatus={setStatus}
                  onNavigate={onNavigate}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
