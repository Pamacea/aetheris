/**
 * Validation pure des uploads d'images — partagée route serveur / composant
 * client (aucun import Node) : le type déclaré par le navigateur n'est jamais
 * cru, seuls les magic bytes font foi. SVG est refusé (XSS via <script>).
 */

export const UPLOAD_PURPOSES = ["map", "token", "cover", "handout"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export type ImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export type UploadValidation =
  | { ok: true; mime: ImageMime; ext: string }
  | { ok: false; error: string };

/** Messages partagés serveur/client : un refus local dit exactement la même chose. */
export const UPLOAD_MESSAGES = {
  notImage: "Fichier image attendu.",
  tooLarge: "Image trop lourde (max 8 Mo).",
  empty: "Fichier vide.",
  unsupported: "Format d'image non pris en charge (PNG, JPEG, WebP ou GIF).",
  mismatch: "Le type déclaré ne correspond pas au contenu de l'image.",
  badPurpose: "Type d'image inconnu.",
} as const;

const EXTENSIONS: Record<ImageMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/** Signature binaire réelle du fichier ; null si ce n'est pas un format accepté. */
export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // JPEG : FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // WebP : RIFF <taille> WEBP
  if (asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WEBP")) return "image/webp";
  // GIF : GIF87a ou GIF89a
  if (asciiAt(bytes, 0, "GIF87a") || asciiAt(bytes, 0, "GIF89a")) return "image/gif";
  return null;
}

/** Frontière de confiance d'un upload : purpose, taille, type déclaré et contenu. */
export function validateUpload(input: {
  purpose: string;
  declaredType: string;
  size: number;
  bytes: Uint8Array;
}): UploadValidation {
  if (!(UPLOAD_PURPOSES as readonly string[]).includes(input.purpose)) {
    return { ok: false, error: UPLOAD_MESSAGES.badPurpose };
  }
  if (input.size <= 0) return { ok: false, error: UPLOAD_MESSAGES.empty };
  if (input.size > MAX_UPLOAD_BYTES) return { ok: false, error: UPLOAD_MESSAGES.tooLarge };

  const declaredType = input.declaredType.trim().toLowerCase();
  if (!declaredType.startsWith("image/")) {
    return { ok: false, error: UPLOAD_MESSAGES.notImage };
  }

  const mime = sniffImageMime(input.bytes);
  if (!mime) return { ok: false, error: UPLOAD_MESSAGES.unsupported };
  if (declaredType !== mime) return { ok: false, error: UPLOAD_MESSAGES.mismatch };

  return { ok: true, mime, ext: EXTENSIONS[mime] };
}
