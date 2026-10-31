import { VTT_PANEL_CLS } from "./bars";
import type { VttApi, WallLine, WallSelection, WallType } from "./types";
import { VttSelect } from "./vtt-select";

interface VttWallBarProps {
  walls: WallLine[];
  setWalls: (list: WallLine[]) => void;
  draftCount: number;
  apiRef: { current: VttApi | null };
  wallType: WallType;
  setWallType: (type: WallType) => void;
  wallSelection: WallSelection | null;
  deleteWallSelection: (selection: WallSelection | null) => void;
}

/** Libellé + pastille + aide par style (couleurs alignées sur draw.ts). */
const WALL_TYPES: Record<WallType, { label: string; color: string; tip: string }> = {
  wall: { label: "Mur", color: "#e7dcc6", tip: "Mur plein : bloque déplacement et vision." },
  stone: { label: "Pierre", color: "#9aa0a6", tip: "Pierre : bloque déplacement et vision." },
  cave: { label: "Caverne", color: "#7a6b59", tip: "Caverne : bloque déplacement et vision." },
  wood: { label: "Bois", color: "#8b5a2b", tip: "Bois : bloque déplacement et vision." },
  secret: {
    label: "Secret (MJ)",
    color: "#d946ef",
    tip: "Magenta pointillé, visible du MJ seul : bloque la vision des joueurs.",
  },
  window: {
    label: "Fenêtre",
    color: "#67e8f9",
    tip: "Cyan translucide : bloque le déplacement, pas la vision.",
  },
};

const WALL_OPTIONS = (Object.keys(WALL_TYPES) as WallType[]).map((value) => ({
  value,
  label: WALL_TYPES[value].label,
  title: WALL_TYPES[value].tip,
}));

/** Panneau de l'outil Murs : type, tracé en cours, sélection et purge. */
export function VttWallBar({
  walls,
  setWalls,
  draftCount,
  apiRef,
  wallType,
  setWallType,
  wallSelection,
  deleteWallSelection,
}: VttWallBarProps) {
  const selected = wallSelection
    ? (walls.find((w) => w.id === wallSelection.wallId) ?? null)
    : null;

  return (
    <div className={VTT_PANEL_CLS}>
      <span
        className="cursor-help tracking-widest text-muted uppercase"
        title="Clic : sommet aimanté aux angles/grille · clic sur un mur ou un sommet : sélection puis glisser · Suppr : supprimer · Entrée : terminer. Tous bloquent le déplacement ; fenêtre laisse passer la vue, secret bloque la vue des joueurs."
      >
        Murs — {walls.length}
      </span>
      <label className="flex items-center gap-1.5 text-muted">
        Tracé
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 border border-border"
          style={{ backgroundColor: WALL_TYPES[wallType].color }}
        />
        <VttSelect
          value={wallType}
          options={WALL_OPTIONS}
          label="Style du tracé"
          widthCls="w-36"
          onChange={(value) => setWallType(value as WallType)}
        />
      </label>
      {selected && wallSelection ? (
        <>
          <span className="text-muted">
            {wallSelection.vertex === null
              ? `Mur sélectionné (${WALL_TYPES[selected.type].label})`
              : `Sommet ${wallSelection.vertex + 1}/${selected.points.length}`}
          </span>
          {wallSelection.vertex === null && (
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 border border-border"
                style={{ backgroundColor: WALL_TYPES[selected.type].color }}
              />
              <VttSelect
                value={selected.type}
                options={WALL_OPTIONS}
                label="Style du mur sélectionné"
                widthCls="w-36"
                onChange={(value) =>
                  setWalls(
                    walls.map((w) =>
                      w.id === selected.id ? { ...w, type: value as WallType } : w,
                    ),
                  )
                }
              />
            </span>
          )}
          <button
            type="button"
            className="btn px-2 py-1 text-xs text-destructive"
            onClick={() => deleteWallSelection(wallSelection)}
          >
            {wallSelection.vertex === null ? "Supprimer le mur" : "Supprimer le sommet"}
          </button>
        </>
      ) : null}
      {draftCount > 0 && (
        <>
          <span className="text-muted">
            Tracé en cours : {draftCount} point{draftCount > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="btn px-2 py-1 text-xs text-accent"
            onClick={() => apiRef.current?.finishDraft(wallType)}
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
    </div>
  );
}
