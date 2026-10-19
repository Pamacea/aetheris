import type { Dispatch, SetStateAction } from "react";
import { VTT_BAR_CLS } from "./vtt-app-bars";
import type { GridSettings, GridType } from "./vtt-app-types";

interface VttGridBarProps {
  grid: GridSettings;
  setGrid: Dispatch<SetStateAction<GridSettings>>;
  setGridNum: (key: "size" | "offsetX" | "offsetY", raw: string) => void;
  mapUrl: string | null;
  setMapUrl: Dispatch<SetStateAction<string | null>>;
  objectUrlRef: { current: string | null };
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Barre de l'outil Grille : carte (fichier), type/size/offset de grille. */
export function VttGridBar({
  grid,
  setGrid,
  setGridNum,
  mapUrl,
  setMapUrl,
  objectUrlRef,
  onFileChange,
}: VttGridBarProps) {
  return (
    <div className={VTT_BAR_CLS}>
      <span className="tracking-widest text-muted uppercase">Carte</span>
      <label className="btn cursor-pointer px-2 py-1 text-xs">
        Charger…
        <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </label>
      {mapUrl && (
        <button
          type="button"
          className="btn px-2 py-1 text-xs text-muted"
          onClick={() => {
            if (objectUrlRef.current) {
              URL.revokeObjectURL(objectUrlRef.current);
              objectUrlRef.current = null;
            }
            setMapUrl(null);
          }}
        >
          Retirer
        </button>
      )}
      <span aria-hidden className="mx-1 h-4 w-px bg-border" />
      <span className="tracking-widest text-muted uppercase">Grille</span>
      <select
        className="input w-36 py-1 text-xs"
        value={grid.type}
        onChange={(e) => setGrid((g) => ({ ...g, type: e.target.value as GridType }))}
      >
        <option value="square">Carrée</option>
        <option value="hex">Hexagonale</option>
        <option value="none">Sans grille</option>
      </select>
      <label className="flex items-center gap-1.5 text-muted">
        Taille
        <input
          className="input w-20 py-1 text-right font-mono text-xs"
          type="number"
          min={16}
          max={512}
          value={grid.size}
          onChange={(e) => setGridNum("size", e.target.value)}
        />
      </label>
      <label className="flex items-center gap-1.5 text-muted">
        Offset X
        <input
          className="input w-20 py-1 text-right font-mono text-xs"
          type="number"
          value={grid.offsetX}
          onChange={(e) => setGridNum("offsetX", e.target.value)}
        />
      </label>
      <label className="flex items-center gap-1.5 text-muted">
        Offset Y
        <input
          className="input w-20 py-1 text-right font-mono text-xs"
          type="number"
          value={grid.offsetY}
          onChange={(e) => setGridNum("offsetY", e.target.value)}
        />
      </label>
    </div>
  );
}
