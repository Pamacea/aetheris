import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { VTT_PANEL_CLS } from "./bars";
import type { GridSettings, GridType } from "./types";
import { VttSelect } from "./vtt-select";

interface VttGridBarProps {
  grid: GridSettings;
  setGrid: Dispatch<SetStateAction<GridSettings>>;
  setGridNum: (key: "size" | "offsetX" | "offsetY", raw: string) => void;
  /** Carte distante : seule valeur persistée et diffusée. */
  mapUrl: string | null;
  /** Aperçu blob local (échec d'upload uniquement), jamais commité. */
  mapPreview: string | null;
  applyMap: (raw: string) => boolean;
  removeMap: () => void;
  /** Erreur d'envoi du fichier (503 sans stockage, réseau…). */
  uploadError: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Panneau de l'outil Grille : un seul bloc carte (URL appliquée + aperçu local
 * discret) puis type/taille/offset de grille.
 */
export function VttGridBar({
  grid,
  setGrid,
  setGridNum,
  mapUrl,
  mapPreview,
  applyMap,
  removeMap,
  uploadError,
  onFileChange,
}: VttGridBarProps) {
  const urlRef = useRef<HTMLInputElement>(null);
  const [urlError, setUrlError] = useState(false);

  const applyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    // http(s) absolu uniquement — blob:, javascript: et relatif sont rejetés.
    if (!applyMap(urlRef.current?.value ?? "")) setUrlError(true);
    else setUrlError(false);
  };
  return (
    <div className={VTT_PANEL_CLS}>
      <span className="tracking-widest text-muted uppercase">Carte</span>
      <form onSubmit={applyUrl} className="flex items-center gap-1.5 text-muted">
        <input
          key={mapUrl ?? ""}
          ref={urlRef}
          className="input w-56 py-1 text-xs"
          defaultValue={mapUrl ?? ""}
          onChange={() => setUrlError(false)}
          placeholder="https://…/carte.png"
          aria-label="URL de la carte"
        />
        <label
          className="btn cursor-pointer px-2 py-1 text-xs"
          title="Envoyer une image de carte"
          aria-label="Envoyer une image de carte"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="M3 7h6l2 2h10v9H3z" strokeLinejoin="round" />
          </svg>
          <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </label>
        <button type="submit" className="btn px-2 py-1 text-xs">
          Appliquer la carte
        </button>
        {urlError && (
          <span role="alert" className="text-[0.65rem] text-destructive">
            URL http(s) invalide
          </span>
        )}
      </form>
      {uploadError && (
        <span role="alert" className="text-[0.65rem] text-destructive">
          {uploadError}
        </span>
      )}
      {(mapUrl || mapPreview) && (
        <button type="button" className="btn px-2 py-1 text-xs text-muted" onClick={removeMap}>
          Retirer
        </button>
      )}
      <span className="tracking-widest text-muted uppercase">Grille</span>
      <VttSelect
        value={grid.type}
        label="Type de grille"
        widthCls="w-36"
        options={[
          { value: "square", label: "Carrée" },
          { value: "hex", label: "Hexagonale" },
          { value: "none", label: "Sans grille" },
        ]}
        onChange={(value) => setGrid((g) => ({ ...g, type: value as GridType }))}
      />
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
