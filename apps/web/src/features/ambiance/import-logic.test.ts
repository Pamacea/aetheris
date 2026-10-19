import { describe, expect, it } from "vitest";
import { audioTrackSchema } from "@aetheris/shared";
import { MAX_AUDIO_FILE_BYTES, formatSize, validateAudioFile } from "./import-logic";

describe("validateAudioFile", () => {
  it("accepte un fichier audio dans le plafond", () => {
    expect(validateAudioFile({ name: "brume.mp3", type: "audio/mpeg", size: 1024 })).toBeNull();
  });

  it("refuse un fichier hors audio", () => {
    expect(validateAudioFile({ name: "notes.txt", type: "text/plain", size: 10 })).toMatch(
      /seul un fichier audio/,
    );
  });

  it("refuse un type MIME vide sans extension audio", () => {
    expect(validateAudioFile({ name: "index.html", type: "", size: 10 })).toMatch(
      /seul un fichier audio/,
    );
  });

  it("retombe sur l'extension quand le type MIME est absent", () => {
    expect(validateAudioFile({ name: "gong.ogg", type: "", size: 10 })).toBeNull();
  });

  it("refuse au-delà du plafond de taille, avec message FR", () => {
    const err = validateAudioFile({
      name: "long.mp3",
      type: "audio/mpeg",
      size: MAX_AUDIO_FILE_BYTES + 1,
    });
    expect(err).toMatch(/trop lourd/);
    expect(err).toMatch(/plafond/);
  });

  it("accepte pile au plafond", () => {
    expect(
      validateAudioFile({ name: "max.mp3", type: "audio/mpeg", size: MAX_AUDIO_FILE_BYTES }),
    ).toBeNull();
  });
});

describe("formatSize", () => {
  it("formate en Ko / Mo à la française", () => {
    expect(formatSize(700 * 1024)).toBe("700 Ko");
    expect(formatSize(1.5 * 1024 * 1024)).toBe("1,5 Mo");
    expect(formatSize(0)).toBe("0 Ko");
  });
});

/** Le même schéma rejoue côté client (synchro WS) et côté serveur (actions). */
describe("audioTrackSchema.url", () => {
  const parse = (url: string) => audioTrackSchema.safeParse({ id: "t1", title: "Piste", url });

  it("accepte l'URL distante (channel fallback)", () => {
    expect(parse("https://example.com/ambre.mp3").success).toBe(true);
    expect(parse("http://example.com/ambre.ogg").success).toBe(true);
  });

  it("accepte une data-URI audio", () => {
    const uri = `data:audio/mpeg;base64,${Buffer.from("sons").toString("base64")}`;
    expect(parse(uri).success).toBe(true);
  });

  it("refuse les data-URI non audio (text/html…)", () => {
    expect(parse("data:text/html;base64,PHNjcmlwdD4=").success).toBe(false);
    expect(parse("data:image/png;base64,iVBORw0KGgo=").success).toBe(false);
  });

  it("refuse les schémas exotiques et le base64 malformé", () => {
    expect(parse("javascript:alert(1)").success).toBe(false);
    expect(parse("data:audio/mpeg;base64,~~~").success).toBe(false);
    expect(parse("").success).toBe(false);
  });

  it("refuse une data-URI au-delà du plafond de row", () => {
    expect(parse(`data:audio/mpeg;base64,${"a".repeat(1_100_000)}`).success).toBe(false);
  });
});
