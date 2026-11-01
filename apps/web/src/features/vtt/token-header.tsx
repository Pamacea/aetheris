import { useEffect, useRef } from "react";
import { EyeIcon, EyeOffIcon, TrashIcon } from "@/components/icons";
import { getCampaignSocket } from "@/lib/ws";
import { TOKEN_CONDITIONS, type TokenCondition } from "@aetheris/shared";
import { saveTokenCombat } from "./actions";
import { entityTokenPatch } from "./entity-link";
import { canEditToken, clampHp, clampInt } from "./helpers";
import { TokenImageButton } from "./token-image";
import type { TokenState, VttEntity, VttMember } from "./types";
import { VttSelect } from "./vtt-select";

interface VttTokenHeaderProps {
  token: TokenState;
  /** Campagne de la table (écriture PV/CA dans la fiche liée). */
  campaignId: string;
  isGM: boolean;
  /** Utilisateur courant — propriétaire du jeton ou MJ. */
  userId: string;
  members: VttMember[];
  /** Fiches liables (gmOnly déjà filtré côté serveur). */
  entities: VttEntity[];
  updateToken: (id: string, patch: Partial<TokenState>) => void;
  setTokenNum: (id: string, key: "size", raw: string) => void;
  deleteToken: (id: string) => void;
}

/**
 * Champs sur une ligne défilante (corbeille épinglée à droite) ; la rangée
 * « États » du MJ passe en seconde ligne pleine largeur.
 */
const HEADER_CLS = "flex flex-wrap items-center border-b border-border bg-neutral-950";
const ROW_CLS =
  "no-scrollbar flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto px-2 py-1.5 text-xs";
const NUM_CLS = "input w-14 shrink-0 py-1 text-right font-mono text-xs";
/** Taille du jeton : 3-4 chiffres, champ plus large que les PV/CA. */
const SIZE_CLS = "input w-16 shrink-0 py-1 text-right font-mono text-xs";
const LABEL_CLS = "shrink-0 text-[0.5rem] leading-none tracking-wider text-muted uppercase";
const GROUP_CLS = "flex shrink-0 items-center gap-2 text-muted";
/** Séparateur vertical entre deux champs. */
const SEP_CLS = "h-4 w-px shrink-0 bg-border";

/**
 * En-tête unique du token : nom, PV/PV max/CA, propriétaire, fiche liée,
 * vision, taille et suppression. Remplace l'ancien empilement HP + propriétés.
 */
export function VttTokenHeader({
  token,
  campaignId,
  isGM,
  userId,
  members,
  entities,
  updateToken,
  setTokenNum,
  deleteToken,
}: VttTokenHeaderProps) {
  // Deux saisies peuvent se succéder avant le re-render : les setters relisent
  // cette valeur plutôt que la prop capturée par leur closure.
  const latest = useRef(token);
  // Écritures en série : la dernière saisie gagne, quel que soit l'ordre d'arrivée.
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    latest.current = token;
  });
  if (!canEditToken(token, isGM, userId)) return null;

  const linked = token.noteId ? (entities.find((e) => e.id === token.noteId) ?? null) : null;

  // Jeton lié : PV/PV max/CA répercutés dans la fiche (serveur re-vérifie le
  // propriétaire). Le brouillard reste local, la fiche est la source à l'ouverture.
  const persist = (combat: { hp: number | null; hpMax: number | null; ac: number | null }) => {
    const noteId = latest.current.noteId;
    if (!noteId) return;
    // La fiche est écrite par la server action, la socket ne fait que rediffuser.
    writes.current = writes.current
      .catch(() => undefined)
      .then(() => saveTokenCombat(campaignId, noteId, combat))
      .then((res) => {
        if (res.ok) getCampaignSocket().emit("fiche:sync", { campaignId, entityId: noteId });
      })
      .catch(() => undefined);
  };

  const setHp = (raw: string) => {
    const { hpMax, ac } = latest.current;
    if (!raw.trim()) {
      latest.current = { ...latest.current, hp: null };
      updateToken(token.id, { hp: null });
      persist({ hp: null, hpMax, ac });
      return;
    }
    const n = clampHp(raw, hpMax);
    if (n !== null) {
      latest.current = { ...latest.current, hp: n };
      updateToken(token.id, { hp: n });
      persist({ hp: n, hpMax, ac });
    }
  };

  const setHpMax = (raw: string) => {
    const n = clampInt(raw, 0, 999);
    if (n === null) return;
    // On ne laisse jamais un PV au-dessus du nouveau maximum.
    const hp = latest.current.hp == null ? null : Math.min(latest.current.hp, n);
    latest.current = { ...latest.current, hpMax: n, hp };
    updateToken(token.id, { hpMax: n, hp });
    persist({ hp, hpMax: n, ac: latest.current.ac });
  };

  const setAc = (raw: string) => {
    const n = clampInt(raw, 0, 99);
    if (n === null) return;
    latest.current = { ...latest.current, ac: n };
    updateToken(token.id, { ac: n });
    persist({ hp: latest.current.hp, hpMax: latest.current.hpMax, ac: n });
  };

  const setSight = (patch: Partial<TokenState["sight"]>) =>
    updateToken(token.id, { sight: { ...token.sight, ...patch } });

  /** Champ vide = portée globale du brouillard (`fog.sightCells`). */
  const setSightRange = (raw: string) => {
    if (!raw.trim()) {
      setSight({ rangeCells: null });
      return;
    }
    const n = clampInt(raw, 1, 100);
    if (n !== null) setSight({ rangeCells: n });
  };

  const setLight = (patch: Partial<TokenState["light"]>) =>
    updateToken(token.id, { light: { ...token.light, ...patch } });

  /** États : réservés au MJ (verrouillés côté serveur pour un joueur). */
  const toggleCondition = (id: TokenCondition) => {
    const next = token.conditions.includes(id)
      ? token.conditions.filter((c) => c !== id)
      : [...token.conditions, id];
    // Ordre canonique de la liste, quel que soit l'ordre des clics.
    updateToken(token.id, {
      conditions: TOKEN_CONDITIONS.filter((c) => next.includes(c.id)).map((c) => c.id),
    });
  };

  /** Champ vide = portée globale du brouillard (`fog.sightCells`). */
  const setLightRange = (raw: string) => {
    if (!raw.trim()) {
      setLight({ radiusCells: null });
      return;
    }
    const n = clampInt(raw, 1, 60);
    if (n !== null) setLight({ radiusCells: n });
  };

  /** Liaison : noteId + nom/PV/CA immédiatement repris de la fiche. */
  const linkEntity = (id: string) => {
    const entity = entities.find((e) => e.id === id) ?? null;
    updateToken(
      token.id,
      entity ? { noteId: entity.id, ...entityTokenPatch(entity, entity.schema) } : { noteId: null },
    );
  };

  const ownerOptions = [
    { value: "", label: "— MJ" },
    ...members.map((m) => ({ value: m.userId, label: m.name })),
  ];
  const entityOptions = [
    { value: "", label: "— Aucune —" },
    // Fiche non chargée (ex. gmOnly vue par un joueur, page périmée).
    ...(token.noteId && !linked ? [{ value: token.noteId, label: `Fiche ${token.noteId}` }] : []),
    ...entities.map((e) => ({ value: e.id, label: e.title })),
  ];

  return (
    <div className={HEADER_CLS}>
      {/* Rangée unique : jamais de repli, défilement horizontal si la table est étroite. */}
      <div className={ROW_CLS}>
        <input
          className="input h-6 min-w-20 max-w-48 flex-1 py-0 text-xs font-medium"
          value={token.name}
          readOnly={!isGM || token.noteId !== null}
          aria-label="Nom du token"
          title={
            token.noteId
              ? "Nom fourni par la fiche liée"
              : isGM
                ? "Nom du token"
                : "Nom réservé au MJ"
          }
          onChange={(e) => updateToken(token.id, { name: e.target.value })}
        />
        <span aria-hidden className={SEP_CLS} />

        <span className={GROUP_CLS}>
          <span className={LABEL_CLS}>PV</span>
          <input
            className={NUM_CLS}
            type="number"
            min={0}
            value={token.hp ?? ""}
            placeholder="—"
            aria-label="Points de vie"
            onChange={(e) => setHp(e.target.value)}
          />
          <span aria-hidden>/</span>
          {isGM ? (
            <input
              className={NUM_CLS}
              type="number"
              min={0}
              max={999}
              value={token.hpMax ?? ""}
              placeholder="—"
              aria-label="Points de vie max"
              onChange={(e) => setHpMax(e.target.value)}
            />
          ) : (
            <span className="font-mono">{token.hpMax ?? "?"}</span>
          )}
        </span>

        <span className={GROUP_CLS}>
          <span className={LABEL_CLS}>CA</span>
          {isGM ? (
            <input
              className={NUM_CLS}
              type="number"
              min={0}
              max={99}
              value={token.ac ?? ""}
              placeholder="—"
              aria-label="Classe d'armure"
              onChange={(e) => setAc(e.target.value)}
            />
          ) : (
            <span className="font-mono">{token.ac ?? "—"}</span>
          )}
        </span>

        {isGM && (
          <>
            <span aria-hidden className={SEP_CLS} />
            <span className={GROUP_CLS}>
              <VttSelect
                value={token.ownerId ?? ""}
                options={ownerOptions}
                label="Propriétaire du jeton"
                widthCls="w-16 shrink-0"
                onChange={(value) => updateToken(token.id, { ownerId: value || null })}
                title="Propriétaire du jeton"
              />
            </span>
          </>
        )}

        <span className={GROUP_CLS}>
          <span className={LABEL_CLS}>Fiche</span>
          {isGM ? (
            <VttSelect
              value={token.noteId ?? ""}
              options={entityOptions}
              label="Fiche wiki liée au jeton"
              widthCls="w-28 shrink-0"
              onChange={linkEntity}
            />
          ) : (
            <span className="truncate" title={linked?.title ?? "Aucune fiche liée"}>
              {linked?.title ?? "—"}
            </span>
          )}
        </span>
        <span aria-hidden className={SEP_CLS} />

        <label className={GROUP_CLS}>
          <span className={LABEL_CLS}>Taille</span>
          {isGM ? (
            <input
              className={SIZE_CLS}
              type="number"
              min={16}
              max={512}
              value={token.size}
              aria-label="Taille du token (px)"
              onChange={(e) => setTokenNum(token.id, "size", e.target.value)}
            />
          ) : (
            <span className="font-mono">{token.size}</span>
          )}
        </label>
        <span aria-hidden className={SEP_CLS} />

        <span className={GROUP_CLS}>
          <button
            type="button"
            aria-pressed={token.sight.enabled}
            aria-label="Vision du jeton"
            title="Vision du jeton"
            onClick={() => setSight({ enabled: !token.sight.enabled })}
            className={`grid h-6 w-6 place-items-center border transition ${
              token.sight.enabled
                ? "border-amber-500/40 text-accent"
                : "border-border hover:text-foreground"
            }`}
          >
            {token.sight.enabled ? (
              <EyeIcon className="h-3.5 w-3.5" />
            ) : (
              <EyeOffIcon className="h-3.5 w-3.5" />
            )}
          </button>
          {token.sight.enabled && (
            <>
              <input
                className="input w-12 shrink-0 py-1 text-right font-mono text-xs"
                type="number"
                min={1}
                max={100}
                value={token.sight.rangeCells ?? ""}
                placeholder="—"
                aria-label="Portée de vision (cases)"
                title="Portée de vision — vide : brouillard global"
                onChange={(e) => setSightRange(e.target.value)}
              />
              <VttSelect
                value={token.sight.type}
                options={[
                  { value: "normal", label: "Normale" },
                  { value: "darkvision", label: "Nocturne" },
                  { value: "cone", label: "Cône" },
                ]}
                label="Type de vision"
                widthCls="w-24 shrink-0"
                onChange={(value) => setSight({ type: value as TokenState["sight"]["type"] })}
              />
            </>
          )}
        </span>

        {isGM && (
          <>
            <span aria-hidden className={SEP_CLS} />
            <span className={GROUP_CLS}>
              <button
                type="button"
                aria-pressed={token.light.enabled}
                aria-label="Lumière du jeton"
                title="Lumière du jeton"
                onClick={() => setLight({ enabled: !token.light.enabled })}
                className={`h-6 shrink-0 border px-1.5 text-[0.6rem] uppercase tracking-wider transition ${
                  token.light.enabled
                    ? "border-amber-500/40 text-accent"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                Lumière
              </button>
              {token.light.enabled && (
                <input
                  className="input w-12 shrink-0 py-1 text-right font-mono text-xs"
                  type="number"
                  min={1}
                  max={60}
                  value={token.light.radiusCells ?? ""}
                  placeholder="—"
                  aria-label="Portée de lumière (cases)"
                  title="Portée de lumière — vide : brouillard global"
                  onChange={(e) => setLightRange(e.target.value)}
                />
              )}
            </span>
          </>
        )}

        {isGM && (
          <>
            <span aria-hidden className={SEP_CLS} />
            <TokenImageButton
              imageUrl={token.imageUrl}
              onSave={(url) => updateToken(token.id, { imageUrl: url || null })}
            />
          </>
        )}
      </div>

      {isGM && (
        <button
          type="button"
          aria-label={`Supprimer ${token.name}`}
          title="Supprimer le token"
          onClick={() => deleteToken(token.id)}
          className="grid shrink-0 self-stretch border-l border-border px-2.5 text-muted transition place-items-center hover:text-destructive"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}

      {isGM && (
        <div className="flex basis-full flex-wrap items-center gap-1 border-t border-border px-2 py-1">
          <span className={LABEL_CLS}>États</span>
          {TOKEN_CONDITIONS.map((condition) => {
            const active = token.conditions.includes(condition.id);
            return (
              <button
                key={condition.id}
                type="button"
                aria-pressed={active}
                aria-label={`${condition.label} : ${active ? "actif" : "inactif"}`}
                title={`${condition.label} — ${active ? "retirer" : "appliquer"}`}
                onClick={() => toggleCondition(condition.id)}
                className={`h-6 shrink-0 border px-1.5 text-[0.6rem] leading-none transition ${
                  active
                    ? "border-amber-500/40 text-accent"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {condition.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
