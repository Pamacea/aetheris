"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeCss, templateSchemaSchema, type TemplateSchema } from "@aetheris/shared";
import { buildFormulaScope } from "@/lib/formula";
import { useDiceRoll } from "@/lib/use-dice-roll";
import type { WikiNoteMeta, WikiTemplateMeta } from "../types";
import { useTemplateAutosave } from "./template-form-autosave";
import { TemplateField } from "./template-form-field";

export type FormSaveStatus = "saving" | "saved" | "error";

interface TemplateFormProps {
  campaignId: string;
  entityId: string;
  schemaRaw: unknown;
  initialData: Record<string, unknown>;
  notes: WikiNoteMeta[];
  templates: WikiTemplateMeta[];
  onStatus: (s: FormSaveStatus) => void;
  onNavigate: (noteId: string) => void;
}

/**
 * Formulaire de fiche généré depuis le template de la note.
 * Rétroactif par construction : éditer le template change le rendu de
 * toutes les fiches (les valeurs absentes retombent aux défauts).
 */
export function TemplateForm({
  campaignId,
  entityId,
  schemaRaw,
  initialData,
  notes,
  templates,
  onStatus,
  onNavigate,
}: TemplateFormProps) {
  const parsed = templateSchemaSchema.safeParse(schemaRaw);
  const schema: TemplateSchema | null = parsed.success ? parsed.data : null;

  const [values, setValues] = useState<Record<string, unknown>>(initialData);
  const formRef = useRef<HTMLFormElement>(null);
  const scheduleSave = useTemplateAutosave(campaignId, entityId, onStatus);

  // shortcut: le CSS n'est pas scopé au bloc, il peut toucher la page —
  // sanitizeCss (client à l'injection + serveur à l'enregistrement) limite
  // les dégâts. Un bloc invalide pendant la frappe n'est pas injecté.
  const cssText = schema
    ? schema.fields
        .filter((f) => f.kind === "css")
        .map((f) => {
          const v = values[f.id];
          if (typeof v !== "string" || !v.trim()) return "";
          const r = sanitizeCss(v);
          return r.ok ? r.css : "";
        })
        .join("\n")
    : "";

  // <style> porté par le conteneur de la fiche : créé au changement,
  // retiré au unmount (et remplacé à chaque update de cssText).
  useEffect(() => {
    const root = formRef.current;
    if (!root || !cssText) return;
    const style = document.createElement("style");
    style.textContent = cssText;
    root.prepend(style);
    return () => {
      style.remove();
    };
  }, [cssText]);

  const dice = useDiceRoll(campaignId);

  if (!schema) {
    return (
      <div className="border-b border-border bg-card px-5 py-3 text-xs text-destructive">
        Schéma de template invalide — la fiche ne peut pas être affichée.
      </div>
    );
  }

  function setValue(id: string, v: unknown) {
    // scheduleSave hors updater : il notifie le parent, or un updater s'exécute
    // pendant le render (setState-in-render React).
    const next = { ...values, [id]: v };
    setValues(next);
    scheduleSave(next);
  }

  // Valeurs effectives : les champs ajoutés au template après création de la
  // fiche retombent rétroactivement à leur défaut (« templates rétroactifs »).
  const effective: Record<string, unknown> = {};
  for (const f of schema.fields) {
    effective[f.id] = f.id in values ? values[f.id] : "default" in f ? (f.default ?? null) : null;
  }

  const numericScope = buildFormulaScope(schema, effective);

  // Scope des champs « js » : valeurs brutes de la fiche + résultats de
  // formules (JSON-sérialisable, passé à runSandbox).
  const jsScope: Record<string, unknown> = { ...effective };
  for (const f of schema.fields) {
    if (f.kind === "formula") jsScope[f.id] = numericScope[f.id];
  }

  const templateCategoryOf = (note: WikiNoteMeta): string | null => {
    if (note.type === "note") return null;
    return templates.find((t) => t.id === note.type)?.category ?? null;
  };

  return (
    <form
      ref={formRef}
      className="template-form flex flex-col gap-3 border-b border-border bg-card px-5 py-4 md:px-10"
      onSubmit={(e) => e.preventDefault()}
    >
      <p className="text-[0.65rem] tracking-[0.2em] text-muted uppercase">
        Fiche · {schema.fields.length} champ{schema.fields.length > 1 ? "s" : ""}
      </p>
      {schema.fields.length === 0 && (
        <p className="text-xs text-muted">
          Ce template ne contient aucun champ. Un MJ peut lui en ajouter dans l’éditeur de modèles —
          la fiche se mettra à jour automatiquement.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {schema.fields.map((field) => (
          <TemplateField
            key={field.id}
            field={field}
            value={values[field.id]}
            setValue={setValue}
            notes={notes}
            categoryOf={templateCategoryOf}
            numericScope={numericScope}
            jsScope={jsScope}
            onNavigate={onNavigate}
            dice={dice}
          />
        ))}
      </div>
    </form>
  );
}
