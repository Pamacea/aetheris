"use client";

import { useEffect, useRef } from "react";
import type { TemplateField, TemplatePreset, TemplateSchema } from "@aetheris/shared";
import type * as React from "react";
import { createTemplate, deleteTemplate, updateTemplate } from "./actions";
import type { WikiTemplateMeta } from "../types";
import type { BuilderState } from "./builder-state";
import { FIELD_ID_RE } from "./builder-field-factory";

export type TemplateActions = ReturnType<typeof useTemplateActions>;

type Draft = { id: string; name: string; category: string | null; fields: TemplateField[] };

const serialize = (draft: Draft) => JSON.stringify(draft);

/** Validations amicales communes à l'autosave et au flush manuel. */
function validateFields(fields: TemplateField[]): string | null {
  const ids = fields.map((f) => f.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) return `Identifiant dupliqué : « ${dup} ».`;
  if (ids.some((id) => !FIELD_ID_RE.test(id))) {
    return "Identifiant invalide : minuscules, chiffres, - ou _, commence par une lettre.";
  }
  if (fields.some((f) => !f.label.trim())) return "Chaque champ doit avoir un libellé.";
  return null;
}

export function useTemplateActions(st: BuilderState) {
  const {
    campaignId,
    selected,
    selectedId,
    fields,
    newName,
    newCategory,
    setSelectedId,
    setItems,
    setStatus,
    setError,
    setNotice,
    setNewOpen,
    setNewName,
    setNewCategory,
  } = st;

  const current: Draft | null = selected
    ? { id: selected.id, name: selected.name, category: selected.category, fields }
    : null;
  const serialized = current ? serialize(current) : null;

  const draftRef = useRef<Draft | null>(null);
  const baselineRef = useRef<string | null>(serialized);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  async function flush() {
    if (savingRef.current) return;
    const draft = draftRef.current;
    if (!draft) return;
    draftRef.current = null;
    const problem = validateFields(draft.fields);
    if (problem) {
      // Saisie en cours invalide : on n'efface rien, on ne sauve pas.
      setError(problem);
      return;
    }
    const attempted = serialize(draft);
    savingRef.current = true;
    setStatus("saving");
    try {
      const res = await updateTemplate(campaignId, draft.id, {
        name: draft.name,
        category: draft.category,
        schema: { fields: draft.fields } satisfies TemplateSchema,
      });
      if (res.ok) {
        baselineRef.current = attempted;
        setStatus("saved");
        setError(null);
      } else {
        draftRef.current = draft;
        setStatus("error");
        setError(res.error);
      }
    } finally {
      savingRef.current = false;
      // Une modification arrivée pendant l'envoi repart aussitôt (pas de
      // relance en boucle sur un échec serveur identique).
      const pending = draftRef.current;
      if (pending && serialize(pending) !== attempted) void flushRef.current();
    }
  }
  // `flush` est recréée à chaque render : la ref garde la dernière version.
  useEffect(() => {
    flushRef.current = flush;
  });

  // Changement de modèle : flush du brouillon précédent puis nouvelle base.
  const prevIdRef = useRef<string | null>(selectedId);
  useEffect(() => {
    if (prevIdRef.current === selectedId) return;
    prevIdRef.current = selectedId;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void flushRef.current();
    baselineRef.current = serialized;
  }, [selectedId, serialized]);

  // Autosave débouncé : ne part que si le contenu diffère du dernier enregistré.
  useEffect(() => {
    if (!current || serialized === null) return;
    if (serialized === baselineRef.current) {
      if (draftRef.current?.id === current.id) draftRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    draftRef.current = current;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushRef.current();
    }, 700);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [serialized, current?.id]);

  // Quitter la page (ou l'éditeur) ne doit pas perdre une position récente.
  useEffect(() => {
    const flushNow = () => void flushRef.current();
    window.addEventListener("beforeunload", flushNow);
    return () => {
      window.removeEventListener("beforeunload", flushNow);
      flushNow();
    };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await flushRef.current();
    const res = await createTemplate(campaignId, {
      name: newName.trim(),
      ...(newCategory.trim() ? { category: newCategory.trim() } : {}),
    });
    if (res.ok) {
      // Revalidation serveur asynchrone : sans ajout local, la sélection
      // retomberait sur le premier modèle et les champs iraient dans celui-ci.
      const created: WikiTemplateMeta = {
        id: res.id,
        name: newName.trim(),
        category: newCategory.trim() || null,
        schema: { fields: [] },
      };
      setItems((prevItems) => [...prevItems, created]);
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

  /** Flush immédiat (plus d'entrée UI : tout passe par l'autosave). */
  async function handleSave() {
    if (!current) return;
    draftRef.current = current;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await flushRef.current();
  }

  async function handleDelete() {
    if (!selected) return;
    const ok = window.confirm(
      `Supprimer le modèle « ${selected.name} » ? Les fiches existantes deviennent des notes libres.`,
    );
    if (!ok) return;
    await flushRef.current();
    const res = await deleteTemplate(campaignId, selected.id);
    if (res.ok) {
      setSelectedId(null);
      setStatus("idle");
      setError(null);
    } else {
      setError(res.error);
    }
  }

  /** Remplace les champs du modèle ouvert par ceux du preset (après confirmation). */
  async function handlePresetReplace(preset: TemplatePreset) {
    if (!current) return;
    const ok = window.confirm(
      `Remplacer les champs de « ${current.name} » par le preset « ${preset.name} » ?`,
    );
    if (!ok) return;
    setError(null);
    await flushRef.current();
    setStatus("saving");
    const res = await updateTemplate(campaignId, current.id, {
      schema: preset.schema,
      ...(preset.customCss ? { customCss: preset.customCss } : {}),
    });
    if (res.ok) {
      if (preset.customCss) {
        setItems((prev) =>
          prev.map((t) => (t.id === current.id ? { ...t, customCss: preset.customCss } : t)),
        );
      }
      baselineRef.current = serialize({ ...current, fields: preset.schema.fields });
      setStatus("saved");
      setNotice(`Champs remplacés par le preset « ${preset.name} ».`);
    } else {
      setStatus("error");
      setError(res.error);
    }
  }

  /** CSS du modèle : écriture explicite (pas d'autosave pendant la frappe). */
  async function handleSaveStyle(css: string): Promise<{ ok: boolean; error?: string }> {
    if (!selected) return { ok: false, error: "Aucun modèle sélectionné." };
    // Ne pas perdre une modification de champ en cours.
    await flushRef.current();
    setError(null);
    const res = await updateTemplate(campaignId, selected.id, { customCss: css });
    if (!res.ok) {
      setError(res.error);
      return { ok: false, error: res.error };
    }
    setItems((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, customCss: css.trim() || null } : t)),
    );
    setNotice("Style du modèle enregistré.");
    return { ok: true };
  }

  return {
    handleCreate,
    handleSave,
    handleDelete,
    handlePresetReplace,
    handleSaveStyle,
    flush,
  };
}
