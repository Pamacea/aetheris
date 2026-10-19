"use client";

import type { Dispatch, SetStateAction } from "react";
import type { AudioTrack } from "@aetheris/shared";
import { AmbianceTrackList } from "./ambiance-track-list";
import { MAX_AUDIO_FILE_BYTES, formatSize } from "./import-logic";
import { MAX_TRACKS } from "./track-logic";

/** Éditeur de playlist (MJ) — champs pilotés par le hook CRUD du dossier. */
export function AmbiancePlaylistEditor({
  editId,
  playlistId,
  draftName,
  setDraftName,
  draftTracks,
  setDraftTracks,
  ntTitle,
  setNtTitle,
  ntUrl,
  setNtUrl,
  pending,
  saveEdits,
  removePlaylist,
  addTrack,
  importTrack,
  setEditId,
}: {
  editId: string;
  playlistId: string | null;
  draftName: string;
  setDraftName: (v: string) => void;
  draftTracks: AudioTrack[];
  setDraftTracks: Dispatch<SetStateAction<AudioTrack[]>>;
  ntTitle: string;
  setNtTitle: (v: string) => void;
  ntUrl: string;
  setNtUrl: (v: string) => void;
  pending: boolean;
  saveEdits: () => void;
  removePlaylist: () => void;
  addTrack: () => void;
  importTrack: (file: File | null | undefined) => void;
  setEditId: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <div className="panel flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nom
          <input
            className="input w-64"
            name="playlist-nom"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={120}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary btn-tri"
          onClick={saveEdits}
          disabled={pending || draftName.trim() === ""}
        >
          Enregistrer
        </button>
        <button type="button" className="btn" onClick={() => setEditId(null)}>
          Fermer
        </button>
        <button
          type="button"
          className="btn text-destructive"
          onClick={removePlaylist}
          disabled={pending}
        >
          Supprimer la playlist
        </button>
        {playlistId === editId && (
          <span className="text-[0.65rem] tracking-widest text-accent uppercase">
            Associée à la scène
          </span>
        )}
      </div>

      <AmbianceTrackList draftTracks={draftTracks} setDraftTracks={setDraftTracks} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input w-48 py-1 text-xs"
          name="piste-titre"
          value={ntTitle}
          onChange={(e) => setNtTitle(e.target.value)}
          placeholder="Titre"
          maxLength={160}
          aria-label="Titre de la nouvelle piste"
        />
        <input
          className="input w-72 py-1 text-xs"
          name="piste-url"
          value={ntUrl}
          onChange={(e) => setNtUrl(e.target.value)}
          placeholder="https://…/piste.mp3"
          maxLength={2048}
          aria-label="URL de la nouvelle piste"
        />
        <button
          type="button"
          className="btn"
          onClick={addTrack}
          disabled={
            ntTitle.trim() === "" || ntUrl.trim() === "" || draftTracks.length >= MAX_TRACKS
          }
        >
          + Ajouter la piste
        </button>
        <span className="text-[0.65rem] text-muted">
          {draftTracks.length}/{MAX_TRACKS}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="btn cursor-pointer px-2 py-1 text-xs">
          Importer un fichier
          <input
            type="file"
            name="piste-fichier"
            accept="audio/*"
            className="hidden"
            aria-label="Importer un fichier sonore"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset : permet de re-sélectionner le même fichier après un refus.
              e.target.value = "";
              importTrack(file);
            }}
          />
        </label>
        <span className="text-[0.65rem] text-muted">
          Fichier local (MP3, OGG, WAV…) — {formatSize(MAX_AUDIO_FILE_BYTES)} max — stocké avec la
          playlist et partagé aux joueurs.
        </span>
      </div>

      <p className="text-[0.65rem] text-muted">
        Les modifications ne partent aux autres clients qu&apos;après « Enregistrer ».
      </p>
    </div>
  );
}
