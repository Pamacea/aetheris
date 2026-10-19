import { VTT_BAR_CLS } from "./vtt-app-bars";
import type { VttApi, WallLine } from "./vtt-app-types";

interface VttWallBarProps {
  walls: WallLine[];
  setWalls: (list: WallLine[]) => void;
  draftCount: number;
  apiRef: { current: VttApi | null };
}

/** Barre de l'outil Murs : état du tracé en cours + purge des murs. */
export function VttWallBar({ walls, setWalls, draftCount, apiRef }: VttWallBarProps) {
  return (
    <div className={VTT_BAR_CLS}>
      <span className="tracking-widest text-muted uppercase">Murs — {walls.length}</span>
      {draftCount > 0 && (
        <>
          <span className="text-muted">
            Tracé en cours : {draftCount} point{draftCount > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="btn px-2 py-1 text-xs text-accent"
            onClick={() => apiRef.current?.finishDraft()}
          >
            Terminer (Entrée)
          </button>
          <button
            type="button"
            className="btn px-2 py-1 text-xs text-muted"
            onClick={() => apiRef.current?.cancelDraft()}
          >
            Annuler (Échap)
          </button>
        </>
      )}
      {walls.length > 0 && (
        <button
          type="button"
          className="btn px-2 py-1 text-xs text-destructive"
          onClick={() => setWalls([])}
        >
          Effacer tout
        </button>
      )}
      <span className="text-[0.65rem] text-muted">
        Cliquez pour poser des sommets (snappés), Entrée pour terminer — les murs bloquent la ligne
        de vue des tokens.
      </span>
    </div>
  );
}
