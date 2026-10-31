"use client";

import { useState } from "react";
import type { TemplatePreset } from "@aetheris/shared";
import { useToast } from "@/components/toast";
import { createWikiEntry } from "../actions";
import { createTemplate, deleteTemplate, updateTemplate } from "./actions";
import { QUICK_CREATE_PRESETS, findTemplateByName } from "./template-quick-create-logic";

/** Création en un clic : modèle depuis un preset (si absent), puis fiche liée. */
export function TemplateQuickCreate({
  campaignId,
  templates,
  onCreated,
}: {
  campaignId: string;
  templates: { id: string; name: string }[];
  onCreated?: (entryId: string) => void;
}) {
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleClick(preset: TemplatePreset) {
    if (pendingId) return;
    setPendingId(preset.id);

    try {
      let templateId = findTemplateByName(templates, preset.name)?.id;
      let createdTemplateId: string | null = null;

      if (!templateId) {
        const created = await createTemplate(campaignId, {
          name: preset.name,
          ...(preset.category ? { category: preset.category } : {}),
        });
        if (!created.ok) {
          toast(created.error);
          return;
        }
        const saved = await updateTemplate(campaignId, created.id, { schema: preset.schema });
        if (!saved.ok) {
          await deleteTemplate(campaignId, created.id); // modèle incomplet
          toast(saved.error);
          return;
        }
        templateId = created.id;
        createdTemplateId = created.id;
      }

      const entry = await createWikiEntry(campaignId, { title: preset.name, templateId });
      if (!entry.ok) {
        if (createdTemplateId) await deleteTemplate(campaignId, createdTemplateId);
        toast(entry.error);
        return;
      }
      onCreated?.(entry.id);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div
      role="group"
      aria-label="Créer une fiche depuis un modèle"
      className="flex flex-wrap items-center gap-2"
    >
      {QUICK_CREATE_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="btn px-2 py-1 text-xs"
          disabled={pendingId !== null}
          aria-busy={pendingId === preset.id}
          onClick={() => void handleClick(preset)}
        >
          {pendingId === preset.id ? `Création de « ${preset.name} »…` : preset.name}
        </button>
      ))}
    </div>
  );
}
