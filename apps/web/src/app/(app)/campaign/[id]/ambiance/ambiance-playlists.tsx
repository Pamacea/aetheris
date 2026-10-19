"use client";

import type { Playlist } from "@aetheris/shared";

/** Création (MJ) + liste des playlists — affichées quand aucun éditeur n'est ouvert. */
export function AmbiancePlaylists({
  playlists,
  playlistId,
  newName,
  setNewName,
  pending,
  submitNew,
  startEdit,
}: {
  playlists: Playlist[];
  playlistId: string | null;
  newName: string;
  setNewName: (v: string) => void;
  pending: boolean;
  submitNew: (e: React.FormEvent) => void;
  startEdit: (p: Playlist) => void;
}) {
  return (
    <>
      {/* ── Création (MJ) ── */}
      <form onSubmit={submitNew} className="panel flex flex-wrap items-end gap-3 p-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nouvelle playlist
          <input
            className="input w-64"
            name="nouvelle-playlist"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Forêt maudite, Taverne, Combat…"
            maxLength={120}
          />
        </label>
        <button type="submit" className="btn" disabled={pending || newName.trim() === ""}>
          Créer
        </button>
      </form>

      {/* ── Liste des playlists (MJ, éditeur fermé) ── */}
      {playlists.length === 0 ? (
        <p className="panel p-6 text-center text-sm text-muted">
          Aucune playlist — créez-en une puis associez-la à la scène.
        </p>
      ) : (
        <ul className="panel divide-y divide-border">
          {playlists.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <span className="flex-1 text-sm font-medium">
                {p.name}
                {playlistId === p.id && (
                  <span className="ml-2 text-[0.65rem] tracking-widest text-accent uppercase">
                    ▸ scène
                  </span>
                )}
              </span>
              <span className="text-xs text-muted">
                {p.tracks.length} piste{p.tracks.length > 1 ? "s" : ""}
              </span>
              <button type="button" className="btn px-2 py-1 text-xs" onClick={() => startEdit(p)}>
                Modifier
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
