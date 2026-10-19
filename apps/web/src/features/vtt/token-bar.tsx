import { VTT_BAR_CLS } from "./bars";
import type { TokenState } from "./types";

interface VttTokenBarProps {
  selected: TokenState | null;
  updateToken: (id: string, patch: Partial<TokenState>) => void;
  setTokenNum: (id: string, key: "size", raw: string) => void;
  deleteToken: (id: string) => void;
}

/** Barre de l'outil Tokens : propriétés du token sélectionné (ou aide au placement). */
export function VttTokenBar({ selected, updateToken, setTokenNum, deleteToken }: VttTokenBarProps) {
  return (
    <div className={VTT_BAR_CLS}>
      {selected ? (
        <>
          <span className="tracking-widest text-muted uppercase">Token</span>
          <label className="flex items-center gap-1.5 text-muted">
            Nom
            <input
              className="input w-40 py-1 text-xs"
              value={selected.name}
              onChange={(e) => updateToken(selected.id, { name: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-1.5 text-muted">
            Taille
            <input
              className="input w-20 py-1 text-right font-mono text-xs"
              type="number"
              min={16}
              max={512}
              value={selected.size}
              onChange={(e) => setTokenNum(selected.id, "size", e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn px-2 py-1 text-xs text-destructive"
            onClick={() => deleteToken(selected.id)}
          >
            Supprimer
          </button>
          <span className="text-[0.65rem] text-muted">
            Glissez pour déplacer · Suppr pour supprimer
          </span>
        </>
      ) : (
        <span className="text-muted">
          Cliquez sur la scène pour placer un token — il se cale sur la grille. Cliquez sur un token
          pour le sélectionner.
        </span>
      )}
    </div>
  );
}
