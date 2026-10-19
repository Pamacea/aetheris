import type { ReactNode, RefObject } from "react";
import { NOTE_MIME, type NoteDragPayload } from "./notes-palette";
import type { VttApi, VttTool } from "./vtt-app-types";

interface VttStageProps {
  theatre: boolean;
  tool: VttTool;
  containerRef: RefObject<HTMLDivElement | null>;
  apiRef: { current: VttApi | null };
  /** Fiche ouverte (token lié ou note Lore) — rendue en table ET en théâtre. */
  fiche: ReactNode;
}

/** Zone de table : canvas Pixi + panneau de fiche, drop d'une note → token. */
export function VttStage({ theatre, tool, containerRef, apiRef, fiche }: VttStageProps) {
  return (
    <div
      className={`relative min-h-0 flex-1 ${theatre ? "hidden" : "flex"} ${
        tool === "pan"
          ? "cursor-grab active:cursor-grabbing"
          : tool === "token" || tool === "wall"
            ? "cursor-crosshair"
            : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData(NOTE_MIME);
        if (!raw) return;
        let payload: NoteDragPayload;
        try {
          payload = JSON.parse(raw) as NoteDragPayload;
        } catch {
          return;
        }
        if (!payload?.id || !payload.title) return;
        const rect = e.currentTarget.getBoundingClientRect();
        apiRef.current?.dropNote(
          payload.id,
          payload.title,
          e.clientX - rect.left,
          e.clientY - rect.top,
        );
      }}
    >
      <div ref={containerRef} className="min-h-0 flex-1" aria-label="Table de jeu" />
      {fiche}
    </div>
  );
}
