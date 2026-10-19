import type { Dispatch, SetStateAction } from "react";
import { VttModals, type VttModalsProps } from "./vtt-modals";
import type { VttTool } from "./vtt-app-types";

interface VttToolbarProps {
  visibleTools: { id: VttTool; label: string; hint: string; gmOnly: boolean }[];
  tool: VttTool;
  setTool: (tool: VttTool) => void;
  theatre: boolean;
  setTheatre: Dispatch<SetStateAction<boolean>>;
  modals?: VttModalsProps;
  activeHint?: string;
  zoom: number;
}

/** Barre d'outils de la table : outils MJ/joueur, mode Théâtre, modales, zoom. */
export function VttToolbar({
  visibleTools,
  tool,
  setTool,
  theatre,
  setTheatre,
  modals,
  activeHint,
  zoom,
}: VttToolbarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border bg-card px-3 py-1.5">
      {visibleTools.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.hint}
          onClick={() => setTool(t.id)}
          className={`btn px-2.5 py-1 text-xs ${
            tool === t.id
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
      <button
        type="button"
        title="Theatre of the Mind — masquer la table (chat et dés restent actifs)"
        onClick={() => setTheatre((t) => !t)}
        className={`btn ml-auto mr-2 px-2.5 py-1 text-xs ${
          theatre
            ? "border-accent text-accent"
            : "border-transparent text-muted hover:text-foreground"
        }`}
      >
        Théâtre
      </button>
      {modals && <VttModals {...modals} />}
      <span className="flex items-center gap-3 text-[0.65rem] tracking-widest text-muted uppercase">
        <span>{activeHint}</span>
        <span className="font-mono">{Math.round(zoom * 100)} %</span>
      </span>
    </div>
  );
}
