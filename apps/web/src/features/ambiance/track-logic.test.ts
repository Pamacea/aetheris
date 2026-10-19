import { describe, expect, it } from "vitest";
import type { AudioTrack } from "@aetheris/shared";
import {
  MAX_TRACKS,
  appendTrack,
  clampTrackIndex,
  removeTrackAt,
  stepTrackIndex,
} from "./track-logic";

const track = (n: number): AudioTrack => ({
  id: `t${n}`,
  title: `Piste ${n}`,
  url: `https://x/${n}.mp3`,
});

describe("stepTrackIndex", () => {
  it("avance et recule avec wrap-around", () => {
    expect(stepTrackIndex(0, 1, 3)).toBe(1);
    expect(stepTrackIndex(2, 1, 3)).toBe(0); // fin → début
    expect(stepTrackIndex(0, -1, 3)).toBe(2); // début → fin
    expect(stepTrackIndex(1, -1, 3)).toBe(0);
  });

  it("borne l'index de départ puis boucle sur deltas larges", () => {
    expect(stepTrackIndex(99, 1, 3)).toBe(0); // index hors bornes clampé
    expect(stepTrackIndex(0, 4, 3)).toBe(1);
    expect(stepTrackIndex(0, -4, 3)).toBe(2);
  });

  it("playlist vide → 0", () => {
    expect(stepTrackIndex(5, 1, 0)).toBe(0);
    expect(stepTrackIndex(5, -1, 0)).toBe(0);
  });
});

describe("clampTrackIndex", () => {
  it("reste dans [0, count-1] et gère les entrées non finies", () => {
    expect(clampTrackIndex(9, 3)).toBe(2);
    expect(clampTrackIndex(-1, 3)).toBe(0);
    expect(clampTrackIndex(1.9, 3)).toBe(1);
    expect(clampTrackIndex(Number.NaN, 3)).toBe(0);
    expect(clampTrackIndex(5, 0)).toBe(0);
  });
});

describe("appendTrack", () => {
  it("ajoute en fin sans muter le tableau d'origine", () => {
    const original = [track(1)];
    const next = appendTrack(original, track(2));
    expect(next?.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(original).toHaveLength(1);
  });

  it("refuse au-delà du plafond", () => {
    const full = Array.from({ length: MAX_TRACKS }, (_, i) => track(i));
    expect(appendTrack(full, track(MAX_TRACKS))).toBeNull();
    expect(appendTrack(full.slice(0, -1), track(999))).toHaveLength(MAX_TRACKS);
  });
});

describe("removeTrackAt", () => {
  it("supprime à l'index sans muter le tableau d'origine", () => {
    const original = [track(1), track(2), track(3)];
    const next = removeTrackAt(original, 1);
    expect(next.map((t) => t.id)).toEqual(["t1", "t3"]);
    expect(original).toHaveLength(3);
  });

  it("index hors bornes → liste inchangée", () => {
    const list = [track(1)];
    expect(removeTrackAt(list, -1)).toBe(list);
    expect(removeTrackAt(list, 5)).toBe(list);
    expect(removeTrackAt([], 0)).toEqual([]);
  });
});
