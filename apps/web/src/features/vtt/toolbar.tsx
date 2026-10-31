import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CursorIcon, FogIcon, GridIcon, PanIcon, TokenIcon, WallIcon } from "@/components/icons";
import type { VttTool } from "./types";

const TOOL_ICONS = {
  select: CursorIcon,
  pan: PanIcon,
  grid: GridIcon,
  token: TokenIcon,
  wall: WallIcon,
  fog: FogIcon,
} as const;

/** Emplacement réservé dans le dock des modules (`vtt-desktop.tsx`). */
const DOCK_SLOT_ID = "vtt-dock-tools";

interface VttToolbarProps {
  visibleTools: { id: VttTool; label: string; hint: string; gmOnly: boolean }[];
  tool: VttTool;
  setTool: (tool: VttTool) => void;
  zoom: number;
}

/**
 * Outils de la table, posés dans le dock inférieur à côté des modules :
 * icônes seules (libellé au survol), l'outil actif reste allumé en accent.
 */
export function VttToolbar({ visibleTools, tool, setTool, zoom }: VttToolbarProps) {
  // Snapshot serveur null (rien à hydrater), puis le nœud du dock côté client.
  const host = useSyncExternalStore(
    () => () => {},
    () => document.getElementById(DOCK_SLOT_ID),
    () => null,
  );
  if (!host) return null;

  return createPortal(
    <div role="toolbar" aria-label="Outils de la table" className="flex items-center gap-0.5">
      {visibleTools.map((t) => {
        const Icon = TOOL_ICONS[t.id];
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            title={`${t.label} — ${t.hint}`}
            aria-label={t.label}
            aria-pressed={active}
            onClick={() => setTool(t.id)}
            className={`grid h-6 w-6 place-items-center transition ${
              active
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-card-hover hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
      <span className="ml-1 font-mono text-[0.6rem] text-muted" title="Zoom">
        {Math.round(zoom * 100)} %
      </span>
    </div>,
    host,
  );
}
