"use client";

import type * as React from "react";
import {
  fieldLayout,
  GRID_COLS,
  GRID_GAP_PX,
  packFields,
  type ListColumn,
  type TemplateField,
} from "@aetheris/shared";
import type { WikiTemplateMeta } from "../types";
import { PALETTE_ITEMS } from "./builder-palette-data";
import type { BuilderState } from "./builder-state";
import { ROW_STRIDE, findFreeSpot, xFromDrag, yFromDrag } from "./builder-layout";

export type FieldOps = ReturnType<typeof useFieldOps>;

export function useFieldOps(st: BuilderState) {
  const { fields, selected, setItems, setStatus, setNotice, listRef, drag, setDrag, setOpenCfg } =
    st;

  function patchSelected(fn: (t: WikiTemplateMeta) => WikiTemplateMeta) {
    if (!selected) return;
    setItems((prevItems) => prevItems.map((t) => (t.id === selected.id ? fn(t) : t)));
    setStatus("dirty");
    setNotice(null);
  }

  function setFields(next: TemplateField[]) {
    patchSelected((t) => ({ ...t, schema: { fields: next } }));
  }

  function patchField(index: number, fn: (f: TemplateField) => TemplateField) {
    setFields(fields.map((f, i) => (i === index ? fn(f) : f)));
  }

  function patchColumn(fieldIdx: number, colIdx: number, fn: (c: ListColumn) => ListColumn) {
    patchField(fieldIdx, (f) =>
      f.kind === "list" || f.kind === "ability" || f.kind === "inventory"
        ? { ...f, columns: f.columns.map((c, j) => (j === colIdx ? fn(c) : c)) }
        : f,
    );
  }

  function nextFieldId() {
    const used = new Set(fields.map((f) => f.id));
    let n = fields.length + 1;
    let id = `champ${n}`;
    while (used.has(id)) {
      n += 1;
      id = `champ${n}`;
    }
    return id;
  }

  function insertField(make: (id: string) => TemplateField, spot?: { x: number; y: number }) {
    const field = make(nextFieldId());
    // Taille par défaut du kind (10 rangées pour une liste, 6 pour un texte
    // long, 2×2 sinon) : une liste ajoutée garde ses lignes visibles.
    const { w, h } = fieldLayout(field);
    const at = findFreeSpot(fields, spot?.x ?? 0, spot?.y ?? 0, w, h);
    const next = [...fields, { ...field, layout: { ...at, w, h } }];
    setFields(packFields(next));
    // Un panneau déjà ouvert le reste ; sinon on déplie le champ neuf.
    setOpenCfg((prev) => (prev.size > 0 ? prev : new Set([field.id])));
  }

  function toggleCfg(id: string) {
    setOpenCfg((prev) => (prev.has(id) ? new Set() : new Set([id])));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const d = drag;
    setDrag(null);
    if (!d) return;
    const item = PALETTE_ITEMS.find((it) => it.key === d.key);
    const canvas = listRef.current;
    if (!item || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const colW = Math.max(1, (rect.width - (GRID_COLS - 1) * GRID_GAP_PX) / GRID_COLS);
    const colStride = colW + GRID_GAP_PX;
    const { w, h } = fieldLayout(item.make("x"));
    const x = xFromDrag(0, e.clientX - rect.left, colStride, w);
    const y = yFromDrag(0, e.clientY - rect.top, ROW_STRIDE, h);
    insertField(item.make, findFreeSpot(fields, x, y, w, h));
  }

  function handleDragEnd() {
    setDrag(null);
  }

  return {
    patchSelected,
    setFields,
    patchField,
    patchColumn,
    insertField,
    toggleCfg,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
