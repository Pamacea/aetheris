import { MAX_COVER_CHARS } from "./logic";

/** Limite du fichier source ; la data URL (base64) est bornée par MAX_COVER_CHARS. */
export const MAX_COVER_BYTES = 1_200_000;

/** Lit un fichier image en data URL ; rejette avec un message affichable. */
export function readCoverFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Fichier image attendu."));
  }
  if (file.size > MAX_COVER_BYTES) {
    return Promise.reject(new Error("Image trop lourde (max ~1,2 Mo)."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      if (result.length > MAX_COVER_CHARS) reject(new Error("Image trop lourde (max ~1,2 Mo)."));
      else resolve(result);
    };
    reader.onerror = () => reject(new Error("Lecture de l'image impossible."));
    reader.readAsDataURL(file);
  });
}
