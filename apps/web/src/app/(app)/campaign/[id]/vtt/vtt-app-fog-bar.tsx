import type { Dispatch, SetStateAction } from "react";
import { VTT_BAR_CLS } from "./vtt-app-bars";

interface VttFogBarProps {
  fogOn: boolean;
  setFogOn: Dispatch<SetStateAction<boolean>>;
  sightCells: number;
  setSightCells: Dispatch<SetStateAction<number>>;
}

/** Barre de l'outil Brouillard : activation + portée de vue en cellules. */
export function VttFogBar({ fogOn, setFogOn, sightCells, setSightCells }: VttFogBarProps) {
  return (
    <div className={VTT_BAR_CLS}>
      <label className="flex items-center gap-1.5 text-muted">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={fogOn}
          onChange={(e) => setFogOn(e.target.checked)}
        />
        Brouillard activé
      </label>
      <label className="flex items-center gap-1.5 text-muted">
        Portée de vue
        <input
          className="input w-16 py-1 text-right font-mono text-xs"
          type="number"
          min={1}
          max={100}
          value={sightCells}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setSightCells(Math.min(100, Math.max(1, Math.round(n))));
          }}
        />
        cellules
      </label>
      <span className="text-[0.65rem] text-muted">
        La vision des tokens perce le brouillard ; les murs coupent la ligne de vue.
      </span>
    </div>
  );
}
