import { VTT_BAR_CLS } from "./bars";
import { canEditToken, clampHp, clampInt } from "./helpers";
import type { TokenState, VttMember } from "./types";

interface VttHpBarProps {
  token: TokenState;
  isGM: boolean;
  /** Utilisateur courant — propriétaire du jeton ou MJ. */
  userId: string;
  members: VttMember[];
  updateToken: (id: string, patch: Partial<TokenState>) => void;
}

const NUM_CLS = "input w-16 py-1 text-right font-mono text-xs";

/**
 * Barre de PV/CA : édition rapide réservée au MJ (PV, max, CA, propriétaire)
 * ou au propriétaire du jeton (ses PV seuls). C'est le MJ qui donne le jeton
 * à un joueur — d'où le sélecteur « Propriétaire ».
 */
export function VttHpBar({ token, isGM, userId, members, updateToken }: VttHpBarProps) {
  if (!canEditToken(token, isGM, userId)) return null;

  const setHp = (raw: string) => {
    if (!raw.trim()) {
      updateToken(token.id, { hp: null });
      return;
    }
    const n = clampHp(raw, token.hpMax);
    if (n !== null) updateToken(token.id, { hp: n });
  };

  const setHpMax = (raw: string) => {
    const n = clampInt(raw, 0, 999);
    if (n === null) return;
    // On ne laisse jamais un PV au-dessus du nouveau maximum.
    updateToken(token.id, { hpMax: n, hp: token.hp == null ? null : Math.min(token.hp, n) });
  };

  const setAc = (raw: string) => {
    const n = clampInt(raw, 0, 99);
    if (n === null) return;
    updateToken(token.id, { ac: n });
  };

  return (
    <div className={VTT_BAR_CLS}>
      <span className="tracking-widest text-muted uppercase">{token.name}</span>
      <label className="flex items-center gap-1.5 text-muted">
        PV
        <input
          className={NUM_CLS}
          type="number"
          min={0}
          value={token.hp ?? ""}
          placeholder="—"
          aria-label="Points de vie"
          onChange={(e) => setHp(e.target.value)}
        />
      </label>
      {isGM ? (
        <label className="flex items-center gap-1.5 text-muted">
          PV max
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
        </label>
      ) : (
        <span className="text-muted">/ {token.hpMax ?? "?"}</span>
      )}
      {isGM ? (
        <>
          <label className="flex items-center gap-1.5 text-muted">
            CA
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
          </label>
          <label className="flex items-center gap-1.5 text-muted">
            Propriétaire
            <select
              className="input w-44 py-1 text-xs"
              value={token.ownerId ?? ""}
              onChange={(e) => updateToken(token.id, { ownerId: e.target.value || null })}
            >
              <option value="">— MJ</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <span className="text-muted">CA {token.ac ?? "—"}</span>
      )}
    </div>
  );
}
