import { useEffect, useRef, useState } from "react";
import {
  fieldLayout,
  GRID_COLS,
  GRID_GAP_PX,
  GRID_ROW_PX,
  type TemplateField,
} from "@aetheris/shared";
import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import { KIND_GLYPHS } from "./builder-field-factory";
import { FieldRowConfig } from "./builder-field-row-config";
import { FieldPreview } from "./builder-field-preview";
import {
  ROW_STRIDE,
  applyResize,
  keepIfFree,
  xFromDrag,
  yFromDrag,
  type Box,
  type ResizeDir,
} from "./builder-layout";

interface Props {
  st: BuilderState;
  ops: FieldOps;
  field: TemplateField;
  index: number;
  containerWidth: number;
}

const ICON_BUTTON = "btn h-6 w-6 shrink-0 p-0 text-[0.65rem]";

const HANDLES: { dir: ResizeDir; label: string; className: string }[] = [
  { dir: "n", label: "bord supérieur", className: "-top-1 right-2 left-2 h-2.5 cursor-ns-resize" },
  {
    dir: "s",
    label: "bord inférieur",
    className: "-bottom-1 right-2 left-2 h-2.5 cursor-ns-resize",
  },
  { dir: "e", label: "bord droit", className: "top-2 -right-1 bottom-2 w-2.5 cursor-ew-resize" },
  { dir: "w", label: "bord gauche", className: "top-2 -left-1 bottom-2 w-2.5 cursor-ew-resize" },
  {
    dir: "ne",
    label: "coin haut droit",
    className: "-top-1 -right-1 h-2.5 w-2.5 cursor-nesw-resize",
  },
  {
    dir: "nw",
    label: "coin haut gauche",
    className: "-top-1 -left-1 h-2.5 w-2.5 cursor-nwse-resize",
  },
  {
    dir: "se",
    label: "coin bas droit",
    className: "-right-1 -bottom-1 h-2.5 w-2.5 cursor-nwse-resize",
  },
  {
    dir: "sw",
    label: "coin bas gauche",
    className: "-bottom-1 -left-1 h-2.5 w-2.5 cursor-nesw-resize",
  },
];

/** Carte absolue du canvas : déplacement libre, redimensionnement 360°, aperçu, config. */
export function FieldRow({ st, ops, field, index: i, containerWidth }: Props) {
  const { fields, openCfg } = st;
  const { patchField, setFields, toggleCfg } = ops;
  const open = openCfg.has(field.id);
  const cardRef = useRef<HTMLLIElement>(null);
  const [cfgPlacement, setCfgPlacement] = useState<{
    side: "above" | "below" | "right" | "left";
    horizontal: "left" | "right";
    top: number;
  }>({ side: "below", horizontal: "right", top: 0 });
  const layout = fieldLayout(field);
  const colW = Math.max(1, (containerWidth - (GRID_COLS - 1) * GRID_GAP_PX) / GRID_COLS);
  const colStride = colW + GRID_GAP_PX;

  const [move, setMove] = useState<{ x: number; y: number } | null>(null);
  const [resize, setResize] = useState<Box | null>(null);
  const [resizeFocus, setResizeFocus] = useState<ResizeDir | null>(null);
  const activeRef = useRef<"move" | ResizeDir | null>(null);
  const startRef = useRef({ px: 0, py: 0, x: 0, y: 0, w: 0, h: 0 });
  const moveRef = useRef<{ x: number; y: number } | null>(null);
  const resizeRef = useRef<Box | null>(null);

  const box: Box = { ...layout, ...(resize ?? {}), ...(move ?? {}) };
  const left = box.x * colStride;
  const top = box.y * ROW_STRIDE;
  const width = box.w * colW + (box.w - 1) * GRID_GAP_PX;
  const height = box.h * GRID_ROW_PX + (box.h - 1) * GRID_GAP_PX;
  const badge = `${box.x},${box.y} · ${box.w}×${box.h}`;

  function capture(e: React.PointerEvent<HTMLButtonElement>, mode: "move" | ResizeDir) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activeRef.current = mode;
    startRef.current = {
      px: e.clientX,
      py: e.clientY,
      x: layout.x,
      y: layout.y,
      w: layout.w,
      h: layout.h,
    };
    if (mode === "move") {
      moveRef.current = { x: layout.x, y: layout.y };
      setMove(moveRef.current);
    } else {
      resizeRef.current = layout;
      setResize(layout);
    }
  }

  function pointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const mode = activeRef.current;
    if (!mode) return;
    const start = startRef.current;
    const dx = e.clientX - start.px;
    const dy = e.clientY - start.py;
    if (mode === "move") {
      const candidate = {
        x: xFromDrag(start.x, dx, colStride, start.w),
        y: yFromDrag(start.y, dy, ROW_STRIDE, start.h),
        w: start.w,
        h: start.h,
      };
      const current = moveRef.current ?? { x: start.x, y: start.y };
      const kept = keepIfFree(fields, { ...current, w: start.w, h: start.h }, candidate, i);
      if (current.x === kept.x && current.y === kept.y) return;
      const next = { x: kept.x, y: kept.y };
      moveRef.current = next;
      setMove(next);
    } else {
      const candidate = applyResize(mode, start, dx, dy, colStride, ROW_STRIDE);
      const current = resizeRef.current ?? layout;
      const kept = keepIfFree(fields, current, candidate, i);
      if (
        current.x === kept.x &&
        current.y === kept.y &&
        current.w === kept.w &&
        current.h === kept.h
      ) {
        return;
      }
      resizeRef.current = kept;
      setResize(kept);
    }
  }

  function release(e: React.PointerEvent<HTMLButtonElement>) {
    const mode = activeRef.current;
    if (!mode) return;
    activeRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (mode === "move") {
      const next = moveRef.current;
      if (next)
        patchField(i, (f) => ({ ...f, layout: { ...fieldLayout(f), x: next.x, y: next.y } }));
      setMove(null);
    } else {
      const next = resizeRef.current;
      if (next) patchField(i, (f) => ({ ...f, layout: { ...next } }));
      setResize(null);
    }
  }

  /** Panneau adaptatif : dessous → dessus → droite → gauche, borné au viewport. */
  function toggleConfig() {
    if (!open) {
      const rect = cardRef.current?.getBoundingClientRect();
      if (rect) {
        const panelW = 288;
        const panelH = Math.min(window.innerHeight * 0.7, 420);
        const below = window.innerHeight - rect.bottom;
        const above = rect.top;
        const right = window.innerWidth - rect.right;
        const left = rect.left;
        const side =
          below >= panelH
            ? "below"
            : above >= panelH
              ? "above"
              : right >= panelW
                ? "right"
                : left >= panelW
                  ? "left"
                  : below >= above
                    ? "below"
                    : "above";
        let top = 0;
        if (side === "right" || side === "left") {
          const maxTop = window.innerHeight - 8 - panelH;
          if (rect.top > maxTop) top = maxTop - rect.top;
          if (rect.top + top < 8) top = 8 - rect.top;
        }
        setCfgPlacement({
          side,
          horizontal: rect.right - panelW < 8 ? "left" : "right",
          top,
        });
      }
    }
    toggleCfg(field.id);
  }

  // Ferme le panneau au clic extérieur (carte) ou à Échap.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
      } else if (cardRef.current?.contains(e.target as Node)) {
        return;
      }
      toggleCfg(field.id);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open, field.id, toggleCfg]);

  function resizeKeys(e: React.KeyboardEvent<HTMLButtonElement>, dir: ResizeDir) {
    const horizontal = dir.includes("w") || dir.includes("e");
    const vertical = dir.includes("n") || dir.includes("s");
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      if (!horizontal) return;
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      if (!vertical) return;
    } else {
      return;
    }
    const dc = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    const dr = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    e.preventDefault();
    const candidate = applyResize(
      dir,
      layout,
      dc * colStride,
      dr * ROW_STRIDE,
      colStride,
      ROW_STRIDE,
    );
    const next = keepIfFree(fields, layout, candidate, i);
    if (next === layout) return;
    patchField(i, (f) => ({ ...f, layout: next }));
  }

  return (
    <li
      ref={cardRef}
      data-field-row
      style={{ left, top, width, height }}
      className={`group absolute flex flex-col border border-border bg-card p-1.5 ${
        open ? "z-50" : move ? "z-40 opacity-80" : "z-0"
      }`}
    >
      <div className="@container no-scrollbar flex h-full min-h-0 min-w-0 flex-col gap-1 overflow-x-hidden overflow-y-auto">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Déplacer ${field.label}`}
              title="Glisser pour déplacer"
              className="shrink-0 cursor-grab touch-none px-0.5 text-muted hover:text-accent active:cursor-grabbing"
              onPointerDown={(e) => capture(e, "move")}
              onPointerMove={pointerMove}
              onPointerUp={release}
              onPointerCancel={release}
            >
              ⠿
            </button>
            <span
              aria-hidden
              title={field.kind}
              className="flex h-6 w-6 shrink-0 items-center justify-center border border-border bg-background font-mono text-[0.55rem] text-accent"
            >
              {KIND_GLYPHS[field.kind]}
            </span>
          </div>
          <input
            className="input h-6 min-w-0 flex-1 px-1 text-xs @max-[8rem]:basis-full"
            name={`champ-${field.id}-libelle`}
            value={field.label}
            title={field.label}
            placeholder="Libellé"
            onChange={(e) => patchField(i, (f) => ({ ...f, label: e.target.value }))}
          />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              className={`${ICON_BUTTON} ${open ? "border-accent/60 text-accent" : ""}`}
              aria-expanded={open}
              aria-label={`Configuration du champ ${field.label}`}
              onClick={toggleConfig}
            >
              ⚙
            </button>
            <button
              type="button"
              className={`${ICON_BUTTON} text-destructive`}
              onClick={() => setFields(fields.filter((_, j) => j !== i))}
              aria-label={`Supprimer le champ ${field.label}`}
              title="Retirer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Aperçu seulement une fois la carte assez haute (2×2 par défaut = sans aperçu). */}
        {box.h >= 6 && <FieldPreview field={field} />}
      </div>

      {open && (
        <div
          className={`absolute z-50 max-h-[min(70vh,420px)] w-72 overflow-y-auto border border-border bg-background p-2.5 shadow-lg ${
            cfgPlacement.side === "below"
              ? "top-full mt-1"
              : cfgPlacement.side === "above"
                ? "bottom-full mb-1"
                : cfgPlacement.side === "right"
                  ? "left-full top-0 ml-1"
                  : "right-full top-0 mr-1"
          } ${
            cfgPlacement.side === "below" || cfgPlacement.side === "above"
              ? cfgPlacement.horizontal === "left"
                ? "left-0"
                : "right-0"
              : ""
          }`}
          style={
            cfgPlacement.side === "right" || cfgPlacement.side === "left"
              ? { top: cfgPlacement.top }
              : undefined
          }
        >
          <FieldRowConfig st={st} ops={ops} field={field} index={i} />
        </div>
      )}

      {HANDLES.map((handle) => (
        <button
          key={handle.dir}
          type="button"
          role="separator"
          aria-label={`Redimensionner ${field.label} (${handle.label})`}
          title={handle.label}
          className={`absolute z-20 touch-none border-0 bg-transparent opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent/30 focus-visible:border focus-visible:border-accent focus-visible:opacity-100 ${handle.className}`}
          onPointerDown={(e) => capture(e, handle.dir)}
          onPointerMove={pointerMove}
          onPointerUp={release}
          onPointerCancel={release}
          onKeyDown={(e) => resizeKeys(e, handle.dir)}
          onFocus={() => setResizeFocus(handle.dir)}
          onBlur={() => setResizeFocus(null)}
        />
      ))}

      {(move || resize || resizeFocus) && (
        <span className="absolute -top-5 left-0 z-50 bg-accent px-1.5 py-0.5 font-mono text-[0.6rem] text-background">
          {badge}
        </span>
      )}
    </li>
  );
}
