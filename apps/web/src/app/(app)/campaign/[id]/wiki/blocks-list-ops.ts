import type { NoteBlock } from "@aetheris/shared";
import { blockFromPayload, readPayload } from "./blocks-dnd";

/** Opérations de la liste éditable : patch/suppression + drop (ajout/reorder). */
export function createListOps({
  blocks,
  scheduleBlocks,
  setDragOver,
}: {
  blocks: NoteBlock[];
  scheduleBlocks: (next: NoteBlock[]) => void;
  setDragOver: (v: number | null) => void;
}) {
  function update(i: number, patch: Partial<NoteBlock>) {
    scheduleBlocks(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  }

  function remove(i: number) {
    scheduleBlocks(blocks.filter((_, j) => j !== i));
  }

  /** Drop sur la liste : ajout (bibliothèque) ou réordonnancement (payload.index). */
  function handleListDrop(e: React.DragEvent, at: number) {
    const p = readPayload(e);
    if (!p) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    if (typeof p.index === "number") {
      const next = [...blocks];
      const [moved] = next.splice(p.index, 1);
      const target = p.index < at ? at - 1 : at;
      next.splice(target, 0, moved);
      scheduleBlocks(next);
    } else {
      const next = [...blocks];
      next.splice(at, 0, blockFromPayload(p));
      scheduleBlocks(next);
    }
  }

  return { update, remove, handleListDrop };
}
