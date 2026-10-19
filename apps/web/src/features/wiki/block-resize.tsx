"use client";

import type { NodeViewProps } from "@tiptap/react";
import { resizeFrame, type BlockFrame, type ResizeEdge } from "./blocks-frame";

const HANDLES: ReadonlyArray<{ edge: ResizeEdge; cls: string; floatingOnly?: boolean }> = [
  { edge: "l", cls: "-left-1.5 top-0 h-full w-1.5 cursor-ew-resize", floatingOnly: true },
  { edge: "r", cls: "-right-1.5 top-0 h-full w-1.5 cursor-ew-resize" },
  { edge: "t", cls: "left-0 -top-1.5 h-1.5 w-full cursor-ns-resize", floatingOnly: true },
  { edge: "b", cls: "left-0 -bottom-1.5 h-1.5 w-full cursor-ns-resize" },
  { edge: "se", cls: "-right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize" },
];

/**
 * Bordures redimensionnables à la souris (style fenêtre, comme Amsel) :
 * droite/bas pilotent w/h — et gauche/haut x/y quand le bloc flotte. Rails
 * posés juste hors du bloc (zéro recouvrement avec les boutons internes) ,
 * invisibles au repos, révélés au survol (classe `group` sur le wrapper) ;
 * la grille du placement apparaît pendant le geste. Côté joueur, la vue ne
 * rend pas le composant (`editor.isEditable` est faux).
 */
export function BlockResizeEdges({
  editor,
  frame,
  updateAttributes,
}: {
  editor: NodeViewProps["editor"];
  frame: BlockFrame;
  updateAttributes: NodeViewProps["updateAttributes"];
}) {
  function onPointerDown(e: React.PointerEvent<HTMLSpanElement>, edge: ResizeEdge) {
    e.preventDefault();
    e.stopPropagation();
    const root = editor.view.dom;
    const wrapper = e.currentTarget.parentElement;
    if (!wrapper) return;
    const rootRect = root.getBoundingClientRect();
    const blockRect = wrapper.getBoundingClientRect();
    const start = {
      left: blockRect.left - rootRect.left,
      top: blockRect.top - rootRect.top,
      right: blockRect.right - rootRect.left,
      bottom: blockRect.bottom - rootRect.top,
    };
    const containerW = rootRect.width;
    root.classList.add("wiki-block-grid");
    const move = (ev: PointerEvent) => {
      updateAttributes(
        resizeFrame(
          frame,
          edge,
          start,
          ev.clientX - rootRect.left,
          ev.clientY - rootRect.top,
          containerW,
        ),
      );
    };
    const up = () => {
      root.classList.remove("wiki-block-grid");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const floating = frame.x !== null && frame.y !== null;
  return (
    <>
      {HANDLES.map((h) =>
        h.floatingOnly && !floating ? null : (
          <span
            key={h.edge}
            aria-hidden
            className={`absolute z-10 bg-transparent opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent-2/70 ${h.cls}`}
            onPointerDown={(e) => onPointerDown(e, h.edge)}
          />
        ),
      )}
    </>
  );
}
