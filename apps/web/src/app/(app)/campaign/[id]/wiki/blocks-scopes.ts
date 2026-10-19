"use client";

import { useEffect, useRef, useState } from "react";
import { templateSchemaSchema, type NoteBlock, type TemplateSchema } from "@aetheris/shared";
import { buildFormulaScope, evaluateFormula } from "@/lib/formula";
import { getWikiFiche } from "../vtt/actions";

type Scope = { schema: TemplateSchema | null; data: Record<string, unknown> };

/** Portée numérique d'un bloc (formula scope de sa fiche source), ou null. */
export type ScopeOf = (b: NoteBlock) => Record<string, number> | null;

/** Fiche source d'un bloc : refNoteId explicite, ou la note elle-même si fiche. */
function sourceIdOf(b: NoteBlock, noteId: string | null, noteType: string): string | null {
  return b.refNoteId ?? (noteType !== "note" ? noteId : null);
}

/** Portée d'un bloc — null tant que la fiche source n'est pas chargée / lisible. */
export function scopeOfBlock(
  scopes: Record<string, Scope>,
  b: NoteBlock,
  noteId: string | null,
  noteType: string,
): Record<string, number> | null {
  const id = sourceIdOf(b, noteId, noteType);
  const src = id ? scopes[id] : null;
  return src?.schema ? buildFormulaScope(src.schema, src.data) : null;
}

/**
 * Texte affiché d'un bloc macro : null sans expr, « … » pendant le chargement,
 * message d'erreur détaillé pour le MJ mais masqué pour le joueur.
 */
export function evalMacroBlock(
  scopes: Record<string, Scope>,
  b: NoteBlock,
  opts: { isGM: boolean; scopeError: string | null; noteId: string | null; noteType: string },
): string | null {
  if (!b.expr) return null;
  const id = sourceIdOf(b, opts.noteId, opts.noteType);
  const src = id ? scopes[id] : null;
  if (!src) return "…";
  if (!src.schema) {
    return opts.isGM
      ? `Fiche introuvable${opts.scopeError ? ` — ${opts.scopeError}` : ""}`
      : "Fiche introuvable";
  }
  const v = evaluateFormula(b.expr, buildFormulaScope(src.schema, src.data));
  if (v === null) return opts.isGM ? "Expression invalide" : "—";
  return String(Math.round(v * 100) / 100);
}

/**
 * Portées des fiches sources des macros (chargées via getWikiFiche),
 * + évaluation du texte affiché d'un bloc macro.
 */
export function useBlockScopes({
  campaignId,
  noteId,
  noteType,
  isGM,
  blocks,
}: {
  campaignId: string;
  noteId: string | null;
  /** "note" ou templateId — les blocs existent pour les deux (macro sur fiche). */
  noteType: string;
  /** Le MJ édite ; le joueur ne reçoit que les blocs non-gm, en lecture seule. */
  isGM: boolean;
  blocks: NoteBlock[];
}) {
  const [scopes, setScopes] = useState<Record<string, Scope>>({});
  const [scopeError, setScopeError] = useState<string | null>(null);
  const requestedRef = useRef<Set<string>>(new Set());

  // Chargement des portées : un seul chemin (getWikiFiche), ids dédoublonnés.
  // shortcut: valeurs au montage du panneau, pas de re-fetch après édition
  // non sauvegardée de la fiche source.
  useEffect(() => {
    const ids = [
      ...new Set(
        blocks
          .filter((b) => b.kind === "macro")
          .map((b) => sourceIdOf(b, noteId, noteType))
          .filter((id): id is string => !!id),
      ),
    ].filter((id) => !(id in scopes) && !requestedRef.current.has(id));
    if (ids.length === 0) return;
    const requested = requestedRef.current;
    for (const id of ids) requested.add(id);
    let cancelled = false;
    void (async () => {
      for (const id of ids) {
        const res = await getWikiFiche(campaignId, id);
        if (cancelled) return;
        if (res.ok) {
          const parsed = templateSchemaSchema.safeParse(res.fiche.schemaRaw);
          setScopes((prev) => ({
            ...prev,
            [id]: { schema: parsed.success ? parsed.data : null, data: res.fiche.data },
          }));
        } else {
          setScopeError(res.error);
          setScopes((prev) => ({ ...prev, [id]: { schema: null, data: {} } }));
        }
      }
    })();
    return () => {
      cancelled = true;
      for (const id of ids) requested.delete(id);
    };
  }, [blocks, scopes, campaignId, noteId, noteType]);

  function scopeOf(b: NoteBlock): Record<string, number> | null {
    return scopeOfBlock(scopes, b, noteId, noteType);
  }

  /** Texte affiché d'un bloc macro (« … » pendant le chargement). */
  function evalMacro(b: NoteBlock): string | null {
    return evalMacroBlock(scopes, b, { isGM, scopeError, noteId, noteType });
  }

  return { scopeOf, evalMacro };
}
