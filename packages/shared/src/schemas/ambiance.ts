import { z } from "zod";

/**
 * Module Ambiance sonore (Phase 8).
 * Playlists par campagne (le MJ les nomme « par scène ») et lecture
 * synchronisée : le MJ pilote, l'état est persisté + relaie aux
 * joueurs via le plugin `ambiance`.
 */

export const audioTrackSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(160),
  /** URL du fichier audio (mp3/ogg/wav…). */
  url: z.string().min(1).max(2048),
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
