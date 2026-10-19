import { describe, expect, it } from "vitest";
import { getAmbianceAudio } from "./ambiance-audio";

/** Faux DOM minimal : on ne teste que la garde SSR + l'unicité de l'instance. */
class FakeAudio {}

describe("getAmbianceAudio", () => {
  it("sans document (SSR) : null", () => {
    expect(getAmbianceAudio()).toBeNull();
  });

  it("avec document : instance unique partagée", () => {
    const g = globalThis as Record<string, unknown>;
    g.document = {};
    g.Audio = FakeAudio;
    try {
      const a = getAmbianceAudio();
      expect(a).toBeInstanceOf(FakeAudio);
      expect(getAmbianceAudio()).toBe(a);
    } finally {
      delete g.document;
      delete g.Audio;
    }
  });
});
