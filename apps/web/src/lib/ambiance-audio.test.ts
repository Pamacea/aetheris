import { describe, expect, it } from "vitest";
import { getAmbianceAudio, stopAmbianceAudio } from "./ambiance-audio";

/** Faux DOM minimal : garde SSR, unicité de l'instance et arrêt explicite. */
class FakeAudio {
  attributes = new Map<string, string>();
  paused = false;
  loads = 0;
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  pause() {
    this.paused = true;
  }
  load() {
    this.loads += 1;
  }
}

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

  it("stop : pause, détache la source et réinitialise le lecteur", () => {
    const g = globalThis as Record<string, unknown>;
    g.document = {};
    g.Audio = FakeAudio;
    try {
      const a = getAmbianceAudio() as unknown as FakeAudio;
      a.setAttribute("src", "https://example.com/piste.mp3");
      a.paused = false;

      stopAmbianceAudio();

      expect(a.paused).toBe(true);
      expect(a.getAttribute("src")).toBeNull();
      expect(a.loads).toBe(1);
    } finally {
      delete g.document;
      delete g.Audio;
    }
  });
});
