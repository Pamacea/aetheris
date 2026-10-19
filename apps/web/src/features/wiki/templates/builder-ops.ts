"use client";

import type * as React from "react";
import type { ListColumn, TemplateField } from "@aetheris/shared";
import type { WikiTemplateMeta } from "../types";
import { PALETTE_ITEMS } from "./builder-palette-data";
import type { BuilderState } from "./builder-state";

export type FieldOps = ReturnType<typeof useFieldOps>;

export function useFieldOps(st: BuilderState) {
  const {
    fields,
    selected,
    setItems,
    setStatus,
    setNotice,
    listRef,
    drag,
    setDrag,
    dragOver,
    setDragOver,
    setOpenCfg,
  } = st;

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
      f.kind === "list"
        ? { ...f, columns: f.columns.map((c, j) => (j === colIdx ? fn(c) : c)) }
        : f,
    );
  }

  function moveField(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
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

  function insertField(make: (id: string) => TemplateField, at: number) {
    const next = [...fields];
    const idx = Math.max(0, Math.min(at, next.length));
    next.splice(idx, 0, make(nextFieldId()));
    setFields(next);
    // Champ neuf : config dépliée automatiquement.
    setOpenCfg((prev) => new Set([...prev, idx]));
  }

  function toggleCfg(index: number) {
    setOpenCfg((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  /** Index d'insertion : au-dessus ou en dessous du rang survolé (point médian). */
  function computeInsertIndex(clientY: number) {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-field-row]");
    if (!rows || rows.length === 0) return 0;
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length;
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = drag?.source === "row" ? "move" : "copy";
    setDragOver(computeInsertIndex(e.clientY));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const at = dragOver ?? computeInsertIndex(e.clientY);
    const d = drag;
    setDrag(null);
    setDragOver(null);
    if (!d) return;
    if (d.source === "palette") {
      const item = PALETTE_ITEMS.find((it) => it.key === d.key);
      if (item) insertField(item.make, at);
      return;
    }
    const from = d.index;
    if (from < 0 || from >= fields.length) return;
    const target = from < at ? at - 1 : at;
    if (target === from) return;
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    setFields(next);
  }

  function handleDragEnd() {
    setDrag(null);
    setDragOver(null);
  }

  return {
    patchSelected,
    setFields,
    patchField,
    patchColumn,
    moveField,
    insertField,
    toggleCfg,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
