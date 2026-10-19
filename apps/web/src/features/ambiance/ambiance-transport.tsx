"use client";

import type { AudioTrack, Playlist } from "@aetheris/shared";

/** Barre de lecture : scène, transport, piste courante, déblocage du son. */
export function AmbianceTransport({
  playlistId,
  isGM,
  playlists,
  playlist,
  track,
  trackIndex,
  blocked,
  playingLocal,
  jump,
  toggle,
  selectScenePlaylist,
  unblock,
}: {
  playlistId: string | null;
  isGM: boolean;
  playlists: Playlist[];
  playlist: Playlist | null;
  track: AudioTrack | null;
  trackIndex: number;
  blocked: boolean;
  playingLocal: boolean;
  jump: (delta: number) => void;
  toggle: () => void;
  selectScenePlaylist: (id: string) => void;
  unblock: () => void;
}) {
  return (
    <>
      <span className="border border-border px-2 py-0.5 text-xs tracking-widest uppercase">
        Scène
      </span>
      {isGM ? (
        <select
          className="input w-56 py-1 text-xs"
          name="playlist-scene"
          value={playlistId ?? ""}
          onChange={(e) => selectScenePlaylist(e.target.value)}
          aria-label="Playlist associée à la scène"
        >
          <option value="">— Aucune playlist —</option>
          {playlists.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm">{playlist?.name ?? "—"}</span>
      )}

      <span aria-hidden className="mx-1 h-4 w-px bg-border" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          onClick={() => jump(-1)}
          disabled={!isGM || !playlist || playlist.tracks.length === 0}
          aria-label="Piste précédente"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden>
            <path d="M2 1h2v10H2zM10 1L4 6l6 5z" />
          </svg>
        </button>
        <button
          type="button"
          className="btn px-3 py-1 text-xs"
          onClick={toggle}
          disabled={!track}
          aria-label={playingLocal ? "Pause" : "Lecture"}
        >
          {playingLocal ? (
            <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden>
              <path d="M2 1h3v10H2zM7 1h3v10H7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden>
              <path d="M2 1l9 5-9 5z" />
            </svg>
          )}
          {playingLocal ? "Pause" : "Lire"}
        </button>
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          onClick={() => jump(1)}
          disabled={!isGM || !playlist || playlist.tracks.length === 0}
          aria-label="Piste suivante"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden>
            <path d="M8 1h2v10H8zM2 1l6 5-6 5z" />
          </svg>
        </button>
      </div>

      <span className="min-w-0 flex-1 truncate text-sm">
        {track ? (
          <>
            <span className="font-medium">{track.title}</span>
            <span className="ml-2 text-xs text-muted">
              {trackIndex + 1}
              {" / "}
              {playlist?.tracks.length}
            </span>
          </>
        ) : (
          <span className="text-muted">Aucune piste</span>
        )}
      </span>

      {blocked && track && (
        <button
          type="button"
          className="btn border-accent px-2 py-1 text-xs text-accent"
          onClick={unblock}
        >
          Activer le son
        </button>
      )}
    </>
  );
}
