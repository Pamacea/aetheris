"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { withEmbed } from "@/components/campaigns/embed-mode";
import { TemplateForm, type FormSaveStatus } from "@/features/wiki/templates/template-form";
import { noteDragStart } from "@/features/wiki/templates/note-drop";
import { linkedNote } from "@/features/wiki/templates/linked-notes";
import type { WikiEntryMeta, WikiTemplateMeta } from "@/features/wiki/types";
import { canEditEntity } from "./access";
import { AssigneePicker } from "./assignee-picker";
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
  isGM: boolean;
  viewerId: string;
  /** Membres de la campagne (sélecteur d'assignation MJ). */
  members: { userId: string; name: string }[];
}

/**
 * Module Fiches joueurs : liste des entités liées à un template à gauche,
 * édition via le TemplateForm du wiki à droite (autosave non dupliquée).
 */
export function FichesApp({
  campaignId,
  fiches,
  notes,
  templates,
  isGM,
  viewerId,
  members,
}: FichesAppProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<FormSaveStatus>("saved");
  const [cat, setCat] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Sous-onglets dynamiques : « Toutes » + les catégories de templates présentes.
  const categories = [
    ...new Set(fiches.map((f) => f.category).filter((c): c is string => c !== null)),
  ].sort((a, b) => a.localeCompare(b, "fr"));
  const visible = cat === null ? fiches : fiches.filter((f) => f.category === cat);
  const selected = visible.find((f) => f.id === selectedId) ?? null;
  const canEdit = selected
    ? canEditEntity(
        {
          role: isGM ? "GM" : "PLAYER",
          assigneeIds: selected.assigneeIds,
          gmOnly: selected.gmOnly,
        },
        viewerId,
      )
    : false;

  // Champ « tag » : autre fiche → sélection locale, sinon ouverture dans le wiki.
  const onNavigate = (noteId: string) => {
    if (fiches.some((f) => f.id === noteId)) {
      setSelectedId(noteId);
      return;
    }
    router.push(withEmbed(`/campaign/${campaignId}/wiki?note=${noteId}`));
  };

  // Résumés des fiches liées : titre, modèle et valeurs affichés sur la carte.
  const linked = Object.fromEntries(
    fiches.map((f) => [
      f.id,
      linkedNote(
        { title: f.title, type: f.templateId },
        { id: f.templateId, name: f.templateName, category: f.category, schema: f.schemaRaw },
        f.data,
      ),
    ]),
  );

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
                ? templates.length === 0
                  ? "Aucun modèle — créez-en un dans le wiki."
                  : "Aucune fiche — créez une entrée depuis un modèle."
                : "Aucune fiche dans cette catégorie."}
            </p>
          )}
          {visible.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                draggable
                onDragStart={(e) => noteDragStart(e, { id: f.id, title: f.title })}
                title="Glisser dans une fiche"
                onClick={() => {
                  setSelectedId(f.id);
                  setStatus("saved");
                  setDetailsOpen(false);
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
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
              <p className="text-sm text-muted">
                {fiches.length === 0
                  ? templates.length === 0
                    ? "Aucun modèle de fiche pour cette campagne."
                    : "Aucune fiche — créez une entrée à partir d’un modèle."
                  : visible.length === 0
                    ? "Aucune fiche dans cette catégorie."
                    : "Sélectionnez une fiche à gauche pour la remplir."}
              </p>
              {fiches.length === 0 && (
                <Link
                  href={
                    templates.length === 0
                      ? `/campaign/${campaignId}/wiki/templates`
                      : `/campaign/${campaignId}/wiki`
                  }
                  className="btn px-3 py-1.5 text-xs"
                >
                  {templates.length === 0 ? "Créer un modèle" : "Ouvrir le wiki"}
                </Link>
              )}
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
                {!canEdit && (
                  <span className="text-[0.65rem] tracking-widest text-muted uppercase">
                    Lecture seule
                  </span>
                )}
                <span
                  className={`text-[0.65rem] ${status === "error" ? "text-destructive" : "text-muted"}`}
                >
                  {STATUS_LABEL[status]}
                </span>
                {isGM && (
                  <button
                    type="button"
                    className="btn px-2 py-1 text-xs"
                    aria-expanded={detailsOpen}
                    aria-controls="fiche-details"
                    onClick={() => setDetailsOpen((o) => !o)}
                  >
                    Détails
                  </button>
                )}
                <Link
                  href={`/campaign/${campaignId}/wiki?note=${selected.id}`}
                  className="text-xs text-accent hover:underline"
                >
                  Wiki →
                </Link>
              </header>
              {isGM && detailsOpen && (
                <div id="fiche-details" className="border-b border-border bg-card px-4 py-2">
                  <AssigneePicker
                    key={selected.id}
                    campaignId={campaignId}
                    entityId={selected.id}
                    members={members}
                    assigneeIds={selected.assigneeIds}
                  />
                </div>
              )}
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <TemplateForm
                  key={selected.id}
                  campaignId={campaignId}
                  entityId={selected.id}
                  schemaRaw={selected.schemaRaw}
                  initialData={selected.data}
                  notes={notes}
                  linked={linked}
                  templates={templates}
                  customCss={templates.find((t) => t.id === selected.templateId)?.customCss ?? null}
                  onStatus={setStatus}
                  onNavigate={onNavigate}
                  readOnly={!canEdit}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
