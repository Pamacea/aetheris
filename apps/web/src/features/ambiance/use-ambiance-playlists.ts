"use client";

import { useState, useTransition, type Dispatch, type SetStateAction } from "react";
import type { AmbianceState, AudioTrack, Playlist } from "@aetheris/shared";
import { createPlaylist, deletePlaylist, updatePlaylist } from "./actions";
import { MAX_SAVE_CHARS, readFileAsDataUri, validateAudioFile } from "./import-logic";
import { MAX_TRACKS, appendTrack } from "./track-logic";

/** CRUD des playlists (MJ) : création, édition, suppression, pistes. */
export function useAmbiancePlaylists({
  campaignId,
  playlistId,
  stateRef,
  commit,
  broadcastChanged,
  setError,
}: {
  campaignId: string;
  playlistId: string | null;
  stateRef: { current: AmbianceState };
  commit: (next: AmbianceState) => Promise<void>;
  broadcastChanged: () => void;
  setError: Dispatch<SetStateAction<string | null>>;
}) {
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftTracks, setDraftTracks] = useState<AudioTrack[]>([]);
  const [ntTitle, setNtTitle] = useState("");
  const [ntUrl, setNtUrl] = useState("");

  function startEdit(p: Playlist): void {
    setEditId(p.id);
    setDraftName(p.name);
    setDraftTracks(p.tracks.map((t) => ({ ...t })));
    setNtTitle("");
    setNtUrl("");
    setError(null);
  }

  function submitNew(e: React.FormEvent): void {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const res = await createPlaylist(campaignId, { name });
      if (!res.ok) return setError(res.error);
      setNewName("");
      broadcastChanged();
    });
  }

  function saveEdits(): void {
    if (!editId) return;
    // shortcut: les data-URI des fichiers importés voyagent dans la requête —
    // au-delà de ~1 Mo le server action Next refuse (413) : refus propre avant.
    if (JSON.stringify(draftTracks).length > MAX_SAVE_CHARS) {
      return setError(
        "Trop de fichiers importés dans cette playlist : l'enregistrement est limité à ~1 Mo. Retirez-en ou remplacez-les par des URLs distantes.",
      );
    }
    setError(null);
    startTransition(async () => {
      const res = await updatePlaylist(campaignId, editId, {
        name: draftName.trim(),
        tracks: draftTracks,
      });
      if (!res.ok) return setError(res.error);
      broadcastChanged();
      setEditId(null);
    });
  }

  function removePlaylist(): void {
    if (!editId) return;
    if (!window.confirm(`Supprimer « ${draftName} » ?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deletePlaylist(campaignId, editId);
      if (!res.ok) return setError(res.error);
      const wasActive = playlistId === editId;
      setEditId(null);
      broadcastChanged();
      // L'action a déjà coupé l'état côté serveur ; on le relaie ici.
      if (wasActive) {
        // stateRef : handler async, l'état peut avoir bougé pendant la mutation.
        void commit({
          ...stateRef.current,
          playlistId: null,
          trackIndex: 0,
          playing: false,
        });
      }
    });
  }

  function addTrack(): void {
    const title = ntTitle.trim();
    const url = ntUrl.trim();
    if (!title || !url) return;
    const next = appendTrack(draftTracks, { id: crypto.randomUUID(), title, url });
    if (!next) return;
    setDraftTracks(next);
    setNtTitle("");
    setNtUrl("");
  }

  /** Import local : validation du fichier → data-URI → piste au brouillon.
   *  L'URL distante reste le canal de repli (champ « URL » ci-dessus). */
  function importTrack(file: File | null | undefined): void {
    if (!file) return;
    const problem = validateAudioFile(file);
    if (problem) return setError(problem);
    if (draftTracks.length >= MAX_TRACKS) {
      return setError(`Playlist complète : ${MAX_TRACKS} pistes max.`);
    }
    setError(null);
    void readFileAsDataUri(file)
      .then((url) => {
        const title =
          file.name
            .replace(/\.[^.]+$/, "")
            .slice(0, 160)
            .trim() || "Piste importée";
        setDraftTracks((ds) => appendTrack(ds, { id: crypto.randomUUID(), title, url }) ?? ds);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Lecture du fichier impossible.");
      });
  }

  return {
    pending,
    newName,
    setNewName,
    editId,
    setEditId,
    draftName,
    setDraftName,
    draftTracks,
    setDraftTracks,
    ntTitle,
    setNtTitle,
    ntUrl,
    setNtUrl,
    startEdit,
    submitNew,
    saveEdits,
    removePlaylist,
    addTrack,
    importTrack,
  };
}
