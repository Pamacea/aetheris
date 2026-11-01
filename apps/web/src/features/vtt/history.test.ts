import { describe, expect, it } from "vitest";
import {
  HISTORY_LIMIT,
  recordHistory,
  redoHistory,
  undoHistory,
  type SceneSnapshot,
  type VttHistory,
} from "./history";

const empty: VttHistory = { undo: [], redo: [] };

/** Instantané distinguable par l'offset de grille. */
const snap = (n: number): SceneSnapshot => ({
  tokens: [],
  walls: [],
  grid: { type: "none", size: 64, offsetX: n, offsetY: 0 },
  mapUrl: null,
  fogOn: false,
  sightCells: 10,
});

describe("recordHistory", () => {
  it("conserve les entrées dans l'ordre et plafonne à 30", () => {
    let history = empty;
    for (let i = 0; i < HISTORY_LIMIT + 1; i++) history = recordHistory(history, snap(i));

    expect(history.undo).toHaveLength(HISTORY_LIMIT);
    // La plus ancienne (0) est évincée, la plus récente reste en tête de pile.
    expect(history.undo[0].grid.offsetX).toBe(1);
    expect(history.undo.at(-1)?.grid.offsetX).toBe(HISTORY_LIMIT);
  });

  it("vide la pile de rétablissement", () => {
    const history = recordHistory({ undo: [], redo: [snap(9)] }, snap(1));
    expect(history.redo).toEqual([]);
  });
});

describe("undoHistory / redoHistory", () => {
  it("pile vide : no-op", () => {
    expect(undoHistory(empty, snap(0))).toBeNull();
    expect(redoHistory(empty, snap(0))).toBeNull();
  });

  it("undo restaure l'état d'avant, puis redo restitue", () => {
    const before = snap(0);
    const after = snap(1);
    const undone = undoHistory(recordHistory(empty, before), after);

    expect(undone?.snapshot).toBe(before);
    expect(undone?.history.undo).toEqual([]);
    expect(undone?.history.redo).toEqual([after]);

    const redone = redoHistory(undone!.history, before);
    expect(redone?.snapshot).toBe(after);
    expect(redone?.history.undo).toEqual([before]);
    expect(redone?.history.redo).toEqual([]);
  });

  it("plusieurs actions : dépile dans l'ordre inverse", () => {
    let history = recordHistory(empty, snap(0));
    history = recordHistory(history, snap(1));

    const first = undoHistory(history, snap(2))!;
    expect(first.snapshot).toBe(history.undo[1]);
    const second = undoHistory(first.history, first.snapshot)!;
    expect(second.snapshot).toBe(history.undo[0]);
  });

  it("une nouvelle action après undo vide le redo", () => {
    const undone = undoHistory(recordHistory(empty, snap(0)), snap(1))!;
    const branched = recordHistory(undone.history, snap(2));

    expect(branched.undo).toEqual([snap(2)]);
    expect(branched.redo).toEqual([]);
  });
});
