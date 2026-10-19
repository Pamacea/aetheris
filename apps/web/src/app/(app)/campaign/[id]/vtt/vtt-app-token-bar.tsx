import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { VTT_BAR_CLS } from "./vtt-app-bars";
import type { TokenState } from "./vtt-app-types";

interface VttTokenBarProps {
  selected: TokenState | null;
  campaignId: string;
  isGM: boolean;
  notes: { id: string; title: string; folder: string | null }[];
  updateToken: (id: string, patch: Partial<TokenState>) => void;
  setTokenNum: (id: string, key: "size" | "rot" | "hp" | "hpMax", raw: string) => void;
  deleteToken: (id: string) => void;
  setFicheTokenId: Dispatch<SetStateAction<string | null>>;
}

/** Barre de l'outil Tokens : propriétés du token sélectionné (ou aide au placement). */
export function VttTokenBar({
  selected,
  campaignId,
  isGM,
  notes,
  updateToken,
  setTokenNum,
  deleteToken,
  setFicheTokenId,
}: VttTokenBarProps) {
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
          <label className="flex items-center gap-1.5 text-muted">
            Rotation
            <input
              className="input w-20 py-1 text-right font-mono text-xs"
              type="number"
              min={0}
              max={359}
              value={selected.rot}
              onChange={(e) => setTokenNum(selected.id, "rot", e.target.value)}
            />
            °
          </label>
          <label className="flex items-center gap-1.5 text-muted">
            PV
            <input
              className="input w-16 py-1 text-right font-mono text-xs"
              type="number"
              min={0}
              max={9999}
              placeholder="—"
              value={selected.hp ?? ""}
              onChange={(e) => setTokenNum(selected.id, "hp", e.target.value)}
            />
            /
            <input
              className="input w-16 py-1 text-right font-mono text-xs"
              type="number"
              min={1}
              max={9999}
              placeholder="—"
              value={selected.hpMax ?? ""}
              onChange={(e) => setTokenNum(selected.id, "hpMax", e.target.value)}
            />
          </label>
          {selected.noteId ? (
            <>
              <Link
                href={`/campaign/${campaignId}/wiki?note=${selected.noteId}`}
                className="text-accent underline-offset-2 hover:underline"
              >
                Ouvrir la fiche →
              </Link>
              {isGM && (
                <button
                  type="button"
                  className="btn px-2 py-1 text-xs"
                  onClick={() => {
                    updateToken(selected.id, { noteId: null });
                    setFicheTokenId((cur) => (cur === selected.id ? null : cur));
                  }}
                >
                  Délier
                </button>
              )}
            </>
          ) : (
            isGM && (
              <label className="flex items-center gap-1.5 text-muted">
                Lier à une fiche
                <select
                  className="input w-44 py-1 text-xs"
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    updateToken(selected.id, { noteId: e.target.value });
                    setFicheTokenId(selected.id);
                  }}
                >
                  <option value="">Choisir…</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </label>
            )
          )}
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
