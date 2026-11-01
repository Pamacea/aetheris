import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_MESSAGES,
  sniffImageMime,
  validateUpload,
} from "./upload-validation";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP = new Uint8Array([
  0x52,
  0x49,
  0x46,
  0x46, // RIFF
  0x00,
  0x00,
  0x00,
  0x00, // taille
  0x57,
  0x45,
  0x42,
  0x50, // WEBP
]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

function check(purpose: string, declaredType: string, bytes: Uint8Array, size = bytes.length) {
  return validateUpload({ purpose, declaredType, size, bytes });
}

describe("sniffImageMime", () => {
  it("reconnaît les signatures PNG, JPEG, WebP et GIF", () => {
    expect(sniffImageMime(PNG)).toBe("image/png");
    expect(sniffImageMime(JPEG)).toBe("image/jpeg");
    expect(sniffImageMime(WEBP)).toBe("image/webp");
    expect(sniffImageMime(GIF)).toBe("image/gif");
  });

  it("refuse un SVG et un contenu arbitraire", () => {
    expect(sniffImageMime(SVG)).toBeNull();
    expect(sniffImageMime(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("validateUpload", () => {
  it("accepte une image valide et renvoie MIME + extension", () => {
    expect(check("cover", "image/png", PNG)).toEqual({
      ok: true,
      mime: "image/png",
      ext: "png",
    });
    expect(check("handout", "image/jpeg", JPEG)).toEqual({
      ok: true,
      mime: "image/jpeg",
      ext: "jpg",
    });
  });

  it("refuse un type déclaré mensonger", () => {
    const result = check("map", "image/png", JPEG);
    expect(result).toEqual({ ok: false, error: UPLOAD_MESSAGES.mismatch });
  });

  it("refuse un SVG même déclaré image/*", () => {
    expect(check("token", "image/svg+xml", SVG)).toEqual({
      ok: false,
      error: UPLOAD_MESSAGES.unsupported,
    });
  });

  it("refuse un fichier non image", () => {
    expect(check("cover", "text/plain", PNG)).toEqual({
      ok: false,
      error: UPLOAD_MESSAGES.notImage,
    });
  });

  it("refuse un dépassement de taille", () => {
    expect(check("map", "image/png", PNG, MAX_UPLOAD_BYTES + 1)).toEqual({
      ok: false,
      error: UPLOAD_MESSAGES.tooLarge,
    });
  });

  it("refuse un fichier vide", () => {
    expect(check("cover", "image/png", new Uint8Array(), 0)).toEqual({
      ok: false,
      error: UPLOAD_MESSAGES.empty,
    });
  });

  it("refuse un purpose inconnu", () => {
    expect(check("avatar", "image/png", PNG)).toEqual({
      ok: false,
      error: UPLOAD_MESSAGES.badPurpose,
    });
  });
});
