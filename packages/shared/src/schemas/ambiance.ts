import { z } from "zod";

/**
 * Module Ambiance sonore (Phase 8).
 * Playlists par campagne (le MJ les nomme « par scène ») et lecture
 * synchronisée : le MJ pilote, l'état est persisté + relaie aux
 * joueurs via le plugin `ambiance`.
 */

/** data-URI d'import de fichier local : MIME `audio/*` + corps base64 strict.
 *  Refuse donc `data:text/html` et consorts (le corps ne peut pas être du HTML). */
const DATA_AUDIO_URI = /^data:audio\/[a-z0-9.+-]+;base64,[a-z0-9+/]+={0,2}$/i;

/** Longueur max d'une piste encodée : 700 Ko de fichier → ~956 Ko en base64
 *  (plafond d'import client), avec marge. Compromis : la data-URI vit dans la
 *  row `tracks` (poids = taille encodée) — si ça pèse un jour, passer à un
 *  stockage fichier dédié (disque/S3 + URL). */
const MAX_DATA_URI_LENGTH = 1_048_576;

export const audioTrackSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(160),
  /** URL distante (http/https) ou data-URI audio (fichier importé par le MJ). */
  url: z.union(
    [
      z
        .url()
        .max(2048)
        // z.url() accepte tout schéma (data:, javascript:…) : on restreint au
        // canal distant — le canal import est la branche data-URI ci-dessous.
        .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
          error: "URL distante invalide (http(s) attendu).",
        }),
      z
        .string()
        .regex(DATA_AUDIO_URI, "data-URI audio invalide (data:audio/…;base64, attendu).")
        .max(MAX_DATA_URI_LENGTH, "Audio importé trop volumineux."),
    ],
    { error: "URL audio invalide : https://… ou data:audio/…;base64, attendu." },
  ),
});
export type AudioTrack = z.infer<typeof audioTrackSchema>;

export const playlistSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(120),
  tracks: z.array(audioTrackSchema).max(100),
  createdAt: z.iso.datetime(),
});
export type Playlist = z.infer<typeof playlistSchema>;

export const createPlaylistSchema = z.object({
  name: z.string().min(1).max(120),
});
export type CreatePlaylist = z.infer<typeof createPlaylistSchema>;

/** Édition d'une playlist (MJ) : au moins une clé attendue côté serveur. */
export const updatePlaylistSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    tracks: z.array(audioTrackSchema).max(100).optional(),
  })
  .refine((v) => v.name !== undefined || v.tracks !== undefined, {
    message: "Rien à modifier.",
  });
export type UpdatePlaylist = z.infer<typeof updatePlaylistSchema>;

/** État de lecture partagé (persisté + broadcast à chaque changement). */
export const ambianceStateSchema = z.object({
  playlistId: z.uuid().nullable(),
  trackIndex: z.number().int().min(0).max(99),
  playing: z.boolean(),
  /** Volume global du MJ (0-1) ; default = pas de migration des états stockés. */
  volume: z.number().min(0).max(1).default(1),
  /** Boucle sur la piste courante, pilotée par le MJ (default = pas de migration). */
  loop: z.boolean().default(false),
});
export type AmbianceState = z.infer<typeof ambianceStateSchema>;

export const EMPTY_AMBIANCE_STATE: AmbianceState = {
  playlistId: null,
  trackIndex: 0,
  playing: false,
  volume: 1,
  loop: false,
};

/** Type d'événement WS du relais générique pour ce module. */
export const AMBIANCE_STATE_EVENT = "ambiance:state";

/** Relais générique : la liste des playlists a changé (refresh des vues). */
export const AMBIANCE_CHANGED_EVENT = "ambiance:playlists-changed";
