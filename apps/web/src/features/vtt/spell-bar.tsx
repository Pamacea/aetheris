"use client";

import { useEffect, useRef, useState } from "react";
import { evaluateSpellFormula, spellCastFormula, spellCost } from "@aetheris/shared";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import { useDiceRoll } from "@/lib/use-dice-roll";
import { saveTokenCombat } from "./actions";
import { VTT_BAR_CLS } from "./bars";
import type { TokenState, VttEntity } from "./types";
import { VttSelect } from "./vtt-select";

interface VttSpellBarProps {
  token: TokenState;
  tokens: TokenState[];
  entities: VttEntity[];
  campaignId: string;
  updateToken: (id: string, patch: Partial<TokenState>) => void;
}

interface SpellAction {
  key: string;
  name: string;
  formula: string | null;
  formulaFieldId: string;
  cost: number;
  heal: boolean;
  linked: VttEntity | null;
}

/** Ressources vérifiées avant usage (si la fiche du lanceur en déclare une). */
const RESOURCE_IDS = new Set(["mana", "charges", "emplacements"]);

/** Sort en attente du jet serveur (expression → résultat → PV de la cible). */
interface PendingCast {
  fieldId: string;
  targetTokenId: string;
  heal: boolean;
  minusAc: boolean;
  applyHp: boolean;
}

function rowString(row: Record<string, unknown>, col: string): string | null {
  const v = row[col];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Sorts liés / saisis dans les champs « Sort / compétence » de la fiche. */
function collectSpells(caster: VttEntity, entities: VttEntity[]): SpellAction[] {
  const schema = caster.schema;
  if (!schema) return [];
  const byId = new Map(entities.map((e) => [e.id, e]));
  const out: SpellAction[] = [];

  for (const field of schema.fields) {
    if (field.kind !== "ability") continue;
    const rows = caster.data[field.id];
    if (!Array.isArray(rows)) continue;
    const tagCols = field.columns.filter((c) => c.type === "tag");
    const formulaCol = field.columns.find((c) => c.type === "formula");
    const costCol = field.columns.find((c) => c.type === "number" && c.id === "cout");
    const textCol = field.columns.find((c) => c.type === "text");

    rows.forEach((raw, index) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      const row = raw as Record<string, unknown>;
      const linkedId = tagCols.map((c) => rowString(row, c.id)).find(Boolean) ?? null;
      const linked = linkedId ? (byId.get(linkedId) ?? null) : null;
      const cast = linked ? spellCastFormula(linked.schema ?? null, linked.data) : null;
      const rowFormula = formulaCol ? rowString(row, formulaCol.id) : null;
      const formula = cast?.formula ?? rowFormula;
      if (!formula && !linked) return;

      const rowCost = costCol ? Number(row[costCol.id]) : NaN;
      const cost = linked
        ? spellCost(linked.schema ?? null, linked.data) || (Number.isFinite(rowCost) ? rowCost : 0)
        : Number.isFinite(rowCost)
          ? rowCost
          : 0;
      const name = linked?.title ?? (textCol ? rowString(row, textCol.id) : null) ?? field.label;

      out.push({
        key: `${field.id}:${index}`,
        name,
        formula,
        formulaFieldId: cast?.fieldId ?? formulaCol?.id ?? field.id,
        cost: Math.max(0, cost),
        heal: /soin|heal/i.test(cast?.fieldId ?? ""),
        linked,
      });
    });
  }
  return out;
}

/**
 * Barre de sorts du jeton sélectionné : cible (soi / autre jeton), jet de la
 * formule contextuelle, résultat au chat et impact PV optionnel.
 */
export function VttSpellBar({
  token,
  tokens,
  entities,
  campaignId,
  updateToken,
}: VttSpellBarProps) {
  const caster = token.noteId ? (entities.find((e) => e.id === token.noteId) ?? null) : null;
  const spells = caster ? collectSpells(caster, entities) : [];

  const { socket } = useCampaignSocket(campaignId);
  const { roll, last } = useDiceRoll(campaignId);
  const [targetId, setTargetId] = useState("self");
  const [applyHp, setApplyHp] = useState(true);
  const [minusAc, setMinusAc] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<PendingCast | null>(null);

  // Jet revenu du serveur : applique l'effet du sort en attente.
  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || !last || last.fieldId !== pending.fieldId) return;
    pendingRef.current = null;
    applyOutcome(pending, last.total);
    // applyOutcome ne lit que des valeurs capturées dans `pending`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last]);

  if (!caster) return null;

  function resourceLeft(): number | null {
    for (const field of caster!.schema?.fields ?? []) {
      if ((field.kind !== "counter" && field.kind !== "number") || !RESOURCE_IDS.has(field.id)) {
        continue;
      }
      const n = Number(caster!.data[field.id]);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  function applyOutcome(pending: PendingCast, amount: number) {
    const target = tokens.find((t) => t.id === pending.targetTokenId);
    if (!target) return;
    const dealt = Math.max(0, amount - (pending.minusAc ? (target.ac ?? 0) : 0));
    const hp = target.hp ?? 0;
    const next = pending.heal
      ? Math.min(target.hpMax ?? Number.POSITIVE_INFINITY, hp + dealt)
      : Math.max(0, hp - dealt);
    if (!pending.applyHp) return;
    updateToken(target.id, { hp: next });
    const noteId = target.noteId;
    if (!noteId) return;
    void saveTokenCombat(campaignId, noteId, {
      hp: next,
      hpMax: target.hpMax,
      ac: target.ac,
    })
      .then((res) => {
        if (res.ok) socket.emit("fiche:sync", { campaignId, entityId: noteId });
      })
      .catch(() => undefined);
  }

  function cast(spell: SpellAction) {
    setError(null);
    setNotice(null);

    if (spell.cost > 0) {
      const left = resourceLeft();
      if (left !== null && left < spell.cost) {
        setError(`Ressources insuffisantes (${left}/${spell.cost}).`);
        return;
      }
    }

    const targetToken =
      targetId === "self" ? token : (tokens.find((t) => t.id === targetId) ?? token);
    const targetEntity = targetToken.noteId
      ? (entities.find((e) => e.id === targetToken.noteId) ?? null)
      : null;
    const ctx = {
      caster: { schema: caster!.schema ?? null, data: caster!.data },
      spell: spell.linked ? { schema: spell.linked.schema ?? null, data: spell.linked.data } : null,
      target: targetEntity
        ? { schema: targetEntity.schema ?? null, data: targetEntity.data }
        : null,
    };
    const pending: PendingCast = {
      fieldId: spell.formulaFieldId,
      targetTokenId: targetToken.id,
      heal: spell.heal,
      minusAc,
      applyHp,
    };
    const head = `${caster!.title} utilise ${spell.name}${
      targetToken.id === token.id ? "" : ` sur ${targetToken.name}`
    }`;

    if (!spell.formula) {
      socket.emit("chat:send", { campaignId, content: head });
      setNotice(`${spell.name} lancé.`);
      return;
    }

    const outcome = evaluateSpellFormula(spell.formula, ctx);
    if ("error" in outcome) {
      setError(outcome.error);
      return;
    }
    if (outcome.value !== null) {
      socket.emit("chat:send", { campaignId, content: `${head} → ${outcome.value}` });
      applyOutcome(pending, outcome.value);
      setNotice(`${spell.name} : ${outcome.value}`);
      return;
    }
    pendingRef.current = pending;
    socket.emit("chat:send", { campaignId, content: head });
    roll(outcome.expression, outcome.scope, spell.formulaFieldId);
    setNotice(`${spell.name} lancé.`);
  }

  return (
    <div className={VTT_BAR_CLS}>
      <span
        className="cursor-help tracking-widest text-muted uppercase"
        title="Glissez une fiche SORT dans un champ « Sort / compétence » de la fiche pour l'ajouter ici."
      >
        Sorts
      </span>
      {spells.length === 0 ? (
        <span className="text-muted">Aucun sort lié</span>
      ) : (
        spells.map((spell) => (
          <button
            key={spell.key}
            type="button"
            className="btn px-2 py-1 text-xs"
            title={spell.formula ?? "Aucune formule : simple annonce au chat"}
            onClick={() => cast(spell)}
          >
            {spell.name}
            {spell.cost > 0 && <span className="ml-1 text-muted">· {spell.cost}</span>}
          </button>
        ))
      )}
      <label className="flex items-center gap-1.5 text-muted">
        Cible
        <VttSelect
          value={targetId}
          label="Cible du sort"
          widthCls="w-40"
          options={[
            { value: "self", label: "Soi-même" },
            ...tokens.filter((t) => t.id !== token.id).map((t) => ({ value: t.id, label: t.name })),
          ]}
          onChange={setTargetId}
        />
      </label>
      <label className="flex items-center gap-1.5 text-muted">
        <input
          type="checkbox"
          checked={applyHp}
          aria-label="Appliquer le résultat aux PV de la cible"
          onChange={(e) => setApplyHp(e.target.checked)}
        />
        PV
      </label>
      <label className="flex items-center gap-1.5 text-muted">
        <input
          type="checkbox"
          checked={minusAc}
          aria-label="Soustraire la CA de la cible"
          onChange={(e) => setMinusAc(e.target.checked)}
        />
        − CA
      </label>
      {error && <span className="text-destructive">{error}</span>}
      {notice && !error && <span className="text-accent">{notice}</span>}
    </div>
  );
}
