"use client";

import type { Editor } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/react";
import { GRID_X, GRID_Y, snapPct, snapPx, type BlockFrame } from "./blocks-frame";

/** Grille invisible affichée uniquement pendant un drag (points d'accroche aux intersections). */
const GRID_CSS = `.ProseMirror.wiki-block-grid::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;background-image:linear-gradient(to right,var(--accent-2) 0 1px,transparent 1px),linear-gradient(to bottom,var(--accent-2) 0 1px,transparent 1px);background-size:${GRID_X}% ${GRID_Y}px,${GRID_X}% ${GRID_Y}px;}`;

const NUDGE: Record<string, readonly [number, number]> = {
  ArrowLeft: [-GRID_X, 0],
  ArrowRight: [GRID_X, 0],
  ArrowUp: [0, -GRID_Y],
  ArrowDown: [0, GRID_Y],
};

function ensureGridStyle() {
  if (document.getElementById("wiki-block-grid")) return;
  const style = document.createElement("style");
  style.id = "wiki-block-grid";
  style.textContent = GRID_CSS;
  document.head.appendChild(style);
}

/**
 * Poignée de déplacement d'un bloc : snap sur la grille invisible (overlay
 * pendant le drag uniquement). Pas de drag HTML5 ni de `posAtCoords` : seul
 * compte le positionnement visuel, les attrs x/y changent sans toucher à la
 * position du nœud dans le document (mi doc, mi canvas).
 * Les flèches du clavier déplacent un bloc déjà positionné d'un pas de grille.
 */
export function BlockDragHandle({
  editor,
  updateAttributes,
  frame,
  className,
}: {
  editor: Editor;
  updateAttributes: NodeViewProps["updateAttributes"];
  frame: BlockFrame;
  className?: string;
}) {
  const floating = frame.x !== null && frame.y !== null;

  function nudge(e: React.KeyboardEvent) {
    const step = NUDGE[e.key];
    if (!step || frame.x === null || frame.y === null) return;
    e.preventDefault();
    updateAttributes({ x: snapPct(frame.x + step[0], 100), y: snapPx(frame.y + step[1]) });
  }

  function startDrag(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 || !editor.isEditable) return;
    const root = editor.view.dom;
    const wrapper = e.currentTarget.closest("[data-node-view-wrapper]");
    if (!(wrapper instanceof HTMLElement)) return;
    e.preventDefault();
    ensureGridStyle();

    const rootRect = root.getBoundingClientRect();
    if (rootRect.width <= 0) return;
    const rect = wrapper.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    // Le bloc ne doit jamais dépasser la droite du conteneur (responsive).
    const maxX = 100 - Math.min((rect.width / rootRect.width) * 100, 100);

    root.classList.add("wiki-block-grid");
    let last = { x: frame.x, y: frame.y };

    const move = (ev: PointerEvent) => {
      const x = snapPct(((ev.clientX - offX - rootRect.left) / rootRect.width) * 100, maxX);
      const y = snapPx(ev.clientY - offY - rootRect.top);
      if (x === last.x && y === last.y) return;
      last = { x, y };
      updateAttributes({ x, y });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      root.classList.remove("wiki-block-grid");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
  }

  return (
    <button
      type="button"
      aria-label="Déplacer le bloc"
      title={
        floating
          ? "Glisser ou flèches du clavier : déplacer sur la grille"
          : "Glisser pour positionner le bloc hors du flux"
      }
      className={`btn cursor-grab px-1.5 py-0.5 text-xs active:cursor-grabbing ${className ?? ""}`}
      onPointerDown={startDrag}
      onKeyDown={nudge}
    >
      ⠿
    </button>
  );
}
