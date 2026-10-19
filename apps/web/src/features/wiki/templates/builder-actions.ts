"use client";

import type * as React from "react";
import type { TemplatePreset, TemplateSchema } from "@aetheris/shared";
import { createTemplate, deleteTemplate, updateTemplate } from "./actions";
import type { BuilderState } from "./builder-state";

export type TemplateActions = ReturnType<typeof useTemplateActions>;

export function useTemplateActions(st: BuilderState) {
  const {
    campaignId,
    selected,
    fields,
    newName,
    newCategory,
    setSelectedId,
    setStatus,
    setError,
    setNotice,
    setNewOpen,
    setNewName,
    setNewCategory,
  } = st;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await createTemplate(campaignId, {
      name: newName.trim(),
      ...(newCategory.trim() ? { category: newCategory.trim() } : {}),
    });
    if (res.ok) {
      setNewOpen(false);
      setNewName("");
      setNewCategory("");
      setSelectedId(res.id);
      setStatus("idle");
      setError(null);
    } else {
      setError(res.error);
    }
  }

  async function handleSave() {
    if (!selected) return;
    setError(null);

    // Validations amicales avant aller-retour serveur.
    const ids = fields.map((f) => f.id);
    const dup = ids.find((id, i) => ids.indexOf(id) !== i);
    if (dup) {
      setError(`Identifiant dupliqué : « ${dup} ».`);
      setStatus("error");
      return;
    }
    if (ids.some((id) => !/^[a-z][a-z0-9_-]{0,63}$/.test(id))) {
      setError("Identifiant invalide : minuscules, chiffres, - ou _, commence par une lettre.");
      setStatus("error");
      return;
    }
    if (fields.some((f) => !f.label.trim())) {
      setError("Chaque champ doit avoir un libellé.");
      setStatus("error");
      return;
    }

    setStatus("saving");
    const res = await updateTemplate(campaignId, selected.id, {
      name: selected.name,
      category: selected.category,
      schema: { fields } satisfies TemplateSchema,
    });
    if (res.ok) {
      setStatus("saved");
      setError(null);
    } else {
      setStatus("error");
      setError(res.error);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    const ok = window.confirm(
      `Supprimer le modèle « ${selected.name} » ? Les fiches existantes deviennent des notes libres.`,
    );
    if (!ok) return;
    const res = await deleteTemplate(campaignId, selected.id);
    if (res.ok) {
      setSelectedId(null);
      setStatus("idle");
      setError(null);
    } else {
      setError(res.error);
    }
  }

  /** Crée un modèle vierge depuis un preset, puis y charge ses champs. */
  async function handlePresetCreate(preset: TemplatePreset) {
    setError(null);
    const created = await createTemplate(campaignId, {
      name: preset.name,
      ...(preset.category ? { category: preset.category } : {}),
    });
    if (!created.ok) {
      setError(created.error);
      setStatus("error");
      return;
    }
    const saved = await updateTemplate(campaignId, created.id, { schema: preset.schema });
    if (!saved.ok) {
      setError(saved.error);
      setStatus("error");
      return;
    }
    setSelectedId(created.id);
    setStatus("idle");
    setNotice(`Modèle « ${preset.name} » créé depuis le preset.`);
  }

  /** Remplace les champs du modèle ouvert par ceux du preset (après confirmation). */
  async function handlePresetReplace(preset: TemplatePreset) {
    if (!selected) return;
    const ok = window.confirm(
      `Remplacer les champs de « ${selected.name} » par le preset « ${preset.name} » ?`,
    );
    if (!ok) return;
    setError(null);
    setStatus("saving");
    const res = await updateTemplate(campaignId, selected.id, { schema: preset.schema });
    if (res.ok) {
      setStatus("saved");
      setNotice(`Champs remplacés par le preset « ${preset.name} ».`);
    } else {
      setStatus("error");
      setError(res.error);
    }
  }

  return {
    handleCreate,
    handleSave,
    handleDelete,
    handlePresetCreate,
    handlePresetReplace,
  };
}
