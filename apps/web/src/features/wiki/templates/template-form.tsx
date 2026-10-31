"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  fieldLayout,
  packFields,
  sanitizeCss,
  templateSchemaSchema,
  type FicheCombat,
  type TemplateSchema,
} from "@aetheris/shared";
import { buildFormulaScope } from "@/lib/formula";
import { useDiceRoll } from "@/lib/use-dice-roll";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import type { WikiNoteMeta, WikiTemplateMeta } from "../types";
import { useTemplateAutosave } from "./template-form-autosave";
import { mergeCombatPatch } from "./template-combat-merge";
import { TemplateField } from "./template-form-field";
import type { LinkedNote } from "./linked-notes";

export type FormSaveStatus = "saving" | "saved" | "error";

interface TemplateFormProps {
  campaignId: string;
  entityId: string;
  schemaRaw: unknown;
  initialData: Record<string, unknown>;
  notes: WikiNoteMeta[];
  linked?: Record<string, LinkedNote>;
  templates: WikiTemplateMeta[];
  /** CSS propre au modèle (stocké sur JsonTemplate, sanitisé). */
  customCss?: string | null;
  onStatus: (s: FormSaveStatus) => void;
  onNavigate: (noteId: string) => void;
  /** Aperçu : rendu réel, mais aucune écriture ni statut d'enregistrement. */
  preview?: boolean;
  /** Lecture seule : champs désactivés, aucune écriture. */
  readOnly?: boolean;
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
  linked = {},
  templates,
  customCss = null,
  onStatus,
  onNavigate,
  preview = false,
  readOnly = false,
}: TemplateFormProps) {
  const parsed = templateSchemaSchema.safeParse(schemaRaw);
  const schema: TemplateSchema | null = parsed.success ? parsed.data : null;

  const [values, setValues] = useState<Record<string, unknown>>(initialData);
  const formRef = useRef<HTMLFormElement>(null);
  const { socket } = useCampaignSocket(campaignId);
  const scheduleSave = useTemplateAutosave(
    campaignId,
    entityId,
    onStatus,
    () => socket.emit("fiche:sync", { campaignId, entityId }),
    !preview && !readOnly,
  );

  // Retour token → fiche : le serveur diffuse les valeurs relues. Fusion via
  // setValues directement (jamais setValue) pour ne pas boucler sur l'autosave.
  useEffect(() => {
    const onCombat = (p: FicheCombat) => {
      if (p.entityId !== entityId) return;
      setValues((prev) => mergeCombatPatch(prev, p.keys, p.patch));
    };
    socket.on("fiche:combat", onCombat);
    return () => {
      socket.off("fiche:combat", onCombat);
    };
  }, [socket, entityId]);

  // shortcut: le CSS n'est pas scopé au bloc, il peut toucher la page —
  // sanitizeCss (client à l'injection + serveur à l'enregistrement) limite
  // les dégâts. Un bloc invalide pendant la frappe n'est pas injecté.
  // CSS du modèle d'abord, champs « css » legacy ensuite : à spécificité
  // égale, la surcharge par fiche existante garde la priorité.
  const modelCss = customCss ? sanitizeCss(customCss) : null;
  const legacyCss = schema
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
  const cssText = [modelCss?.ok ? modelCss.css : "", legacyCss].filter(Boolean).join("\n");

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

  const diceHook = useDiceRoll(campaignId);
  // Aperçu : pas d'émission de jet (aucun appel serveur depuis la modale).
  const dice = preview ? { ...diceHook, roll: () => {} } : diceHook;

  if (!schema) {
    return (
      <div className="border-b border-border bg-card px-5 py-3 text-xs text-destructive">
        Schéma de template invalide — la fiche ne peut pas être affichée.
      </div>
    );
  }

  function setValue(id: string, v: unknown) {
    if (readOnly) return;
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

  // Parité avec le builder : colonnes 12, rangées 16 px et gouttière 8 px exactement.
  // Les champs « css » legacy ne sont plus des blocs visibles : leur CSS reste
  // appliqué (cssText) mais ils ne consomment plus d'espace dans la grille.
  const laid = packFields(schema.fields).filter((f) => f.kind !== "css");

  const templateCategoryOf = (note: WikiNoteMeta): string | null => {
    if (note.type === "note") return null;
    return templates.find((t) => t.id === note.type)?.category ?? null;
  };

  return (
    <form
      ref={formRef}
      className="template-form flex flex-col gap-3"
      onSubmit={(e) => e.preventDefault()}
    >
      {laid.length === 0 && (
        <p className="text-xs text-muted">
          Ce template ne contient aucun champ. Un MJ peut lui en ajouter dans l’éditeur de modèles —
          la fiche se mettra à jour automatiquement.
        </p>
      )}
      <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:auto-rows-[16px]">
          {laid.map((field) => {
            const { x, y, w, h } = fieldLayout(field);
            return (
              <div
                key={field.id}
                className="no-scrollbar min-h-0 min-w-0 overflow-x-hidden overflow-y-auto sm:[grid-column:var(--gc)] sm:[grid-row:var(--gr)]"
                style={
                  {
                    "--gc": `${x + 1} / span ${w}`,
                    "--gr": `${y + 1} / span ${h}`,
                  } as CSSProperties
                }
              >
                <TemplateField
                  field={field}
                  value={values[field.id]}
                  setValue={setValue}
                  notes={notes}
                  linked={linked}
                  categoryOf={templateCategoryOf}
                  numericScope={numericScope}
                  jsScope={jsScope}
                  onNavigate={onNavigate}
                  dice={dice}
                />
              </div>
            );
          })}
        </div>
      </fieldset>
    </form>
  );
}
