"use client";

import type { TemplatePreset } from "@aetheris/shared";
import type { GameSystemOption } from "@/features/game-systems/systems";
import type { WikiTemplateMeta } from "../types";
import { useBuilderState } from "./builder-state";
import { useFieldOps } from "./builder-ops";
import { useTemplateActions } from "./builder-actions";
import { useTemplateIO } from "./builder-io";
import { TemplateSidebar } from "./builder-sidebar";
import { BuilderHeader } from "./builder-header";
import { FieldsList } from "./builder-fields-list";
import { FieldPalette } from "./builder-palette";

interface BuilderProps {
  campaignId: string;
  initial: WikiTemplateMeta[];
  /** Modèles seedés du système de la campagne (« Mes presets »). */
  systemPresets?: TemplatePreset[];
  /** Systèmes homebrew de l'utilisateur (destination d'un preset). */
  systems?: GameSystemOption[];
}

export function TemplatesBuilder({
  campaignId,
  initial,
  systemPresets = [],
  systems = [],
}: BuilderProps) {
  const st = useBuilderState(initial, campaignId);
  const ops = useFieldOps(st);
  const actions = useTemplateActions(st);
  const io = useTemplateIO(st);
  const { selected, fields, error, notice, categories } = st;

  return (
    <div className="flex min-h-0 flex-1">
      {/* ── Panneau gauche : liste des modèles ── */}
      <TemplateSidebar st={st} actions={actions} io={io} systems={systems} />

      {/* ── Panneau droit : éditeur de modèle ── */}
      <main className="no-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
            <p className="text-muted">
              Aucun modèle sélectionné — créez-en un pour structurer vos fiches.
            </p>
            <button
              type="button"
              className="btn btn-primary px-4 py-2"
              onClick={() => st.setNewOpen(true)}
            >
              Créer un modèle
            </button>
          </div>
        ) : (
          <>
            <BuilderHeader
              st={st}
              selected={selected}
              ops={ops}
              actions={actions}
              systemPresets={systemPresets}
            />
            {error && (
              <p className="border-b border-border bg-card px-5 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p className="border-b border-border bg-card px-5 py-2 text-xs text-accent">
                {notice}
              </p>
            )}

            <div className="flex min-h-full flex-1 flex-col gap-3 px-5 py-4 md:px-10">
              <p className="text-[0.65rem] tracking-[0.2em] text-muted uppercase">
                Champs ({fields.length})
              </p>
              <FieldsList st={st} ops={ops} />
              <datalist id={`${campaignId}-tagcat`}>
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </>
        )}
      </main>

      {/* ── Panneau latéral droit : palette de champs à glisser ── */}
      {selected && <FieldPalette st={st} ops={ops} />}
    </div>
  );
}
