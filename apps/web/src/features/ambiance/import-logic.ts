/**
 * Import de fichiers sonores locaux : validation du fichier source puis
 * conversion en data-URI stockée dans la piste (persistée et partagée
 * comme une URL distante).
 */

/** Plafond par fichier source. */
export const MAX_AUDIO_FILE_BYTES = 700 * 1024; // 700 Ko
/**
 * shortcut: 700 Ko et non 4 Mo — un server action Next ne reçoit que 1 Mo
 * de corps (non surmontable ici : `serverActions.bodySizeLimit` vit dans
 * next.config, hors périmètre), et le base64 gonfle ×4/3 (~956 Ko envoyés
 * pour 700 Ko). Compromis DB : la data-URI vit dans la row `tracks`
 * (poids = taille encodée) ; si ça pèse un jour, passer à un stockage
 * fichier dédié (disque/S3 + URL).
 */

/** Corps max sérialisé des pistes envoyées à « Enregistrer » (limite 1 Mo
 *  du server action, marge pour le nom de playlist + enveloppe de requête). */
export const MAX_SAVE_CHARS = 1_000_000;

const AUDIO_EXTENSION = /\.(mp3|ogg|oga|wav|m4a|aac|flac|opus|weba|webm|mid|midi)$/i;

/** Taille lisible à la française (700 Ko, 1,5 Mo…). */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  }
  return `${Math.round(bytes / 1024)} Ko`;
}

/** Refus hors audio, puis plafond de taille ; null = fichier accepté.
 *  Certains OS n'exposent pas de type MIME : on retombe sur l'extension. */
export function validateAudioFile(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  const isAudio =
    file.type.toLowerCase().startsWith("audio/") ||
    (file.type === "" && AUDIO_EXTENSION.test(file.name));
  if (!isAudio) {
    return `Fichier refusé : seul un fichier audio est accepté (${file.name}).`;
  }
  if (file.size > MAX_AUDIO_FILE_BYTES) {
    return `Fichier trop lourd : ${formatSize(file.size)} — plafond ${formatSize(MAX_AUDIO_FILE_BYTES)} par piste.`;
  }
  return null;
}

/** FileReader → data-URI base64 ; toute anomalie est rejetée en français. */
export function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const uri = String(reader.result ?? "");
      if (!uri) reject(new Error("Lecture du fichier impossible."));
      else resolve(uri);
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}
