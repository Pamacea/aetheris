import type { RefObject } from "react";
import type { VttTool } from "./types";

interface VttStageProps {
  tool: VttTool;
  containerRef: RefObject<HTMLDivElement | null>;
}

/** Zone de table : canvas PixiJS (le conteneur est monté par `createVttScene`). */
export function VttStage({ tool, containerRef }: VttStageProps) {
  return (
    <div
      className={`relative flex min-h-0 flex-1 ${
        tool === "pan"
          ? "cursor-grab active:cursor-grabbing"
          : tool === "token" || tool === "wall"
            ? "cursor-crosshair"
            : ""
      }`}
    >
      <div ref={containerRef} className="min-h-0 flex-1" aria-label="Table de jeu" />
    </div>
  );
}
