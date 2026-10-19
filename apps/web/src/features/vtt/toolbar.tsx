import type { VttTool } from "./types";

interface VttToolbarProps {
  visibleTools: { id: VttTool; label: string; hint: string; gmOnly: boolean }[];
  tool: VttTool;
  setTool: (tool: VttTool) => void;
  activeHint?: string;
  zoom: number;
}

/** Barre d'outils de la table : outils MJ/joueur (déjà filtrés) + zoom. */
export function VttToolbar({ visibleTools, tool, setTool, activeHint, zoom }: VttToolbarProps) {
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
      <span className="ml-auto flex items-center gap-3 text-[0.65rem] tracking-widest text-muted uppercase">
        <span>{activeHint}</span>
        <span className="font-mono">{Math.round(zoom * 100)} %</span>
      </span>
    </div>
  );
}
