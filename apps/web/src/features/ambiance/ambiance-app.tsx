"use client";

import type { AmbianceState, Playlist } from "@aetheris/shared";
import { AmbiancePlaylistEditor } from "./ambiance-playlist-editor";
import { AmbiancePlaylists } from "./ambiance-playlists";
import { AmbianceTransport } from "./ambiance-transport";
import { AmbianceVolumes } from "./ambiance-volumes";
import { useAmbiance } from "./use-ambiance";
import { useAmbianceAudio } from "./use-ambiance-audio";
import { useAmbiancePlaylists } from "./use-ambiance-playlists";

/**
 * Ambiance sonore : playlists par scène + lecture synchronisée.
 * Le MJ pilote (état persisté puis relayé via `ambiance:state`), les joueurs
 * suivent en temps réel ; le volume global et la boucle sont partagés,
 * « Mon volume » et le déblocage du son restent locaux à chaque client.
 */
export function AmbianceApp({
  campaignId,
  isGM,
  playlists,
  initialState,
}: {
  campaignId: string;
  isGM: boolean;
  playlists: Playlist[];
  initialState: AmbianceState;
}) {
  const {
    state,
    stateRef,
    error,
    setError,
    commit,
    broadcastChanged,
    playlist,
    trackIndex,
    track,
    localVolume,
    jump,
    selectScenePlaylist,
  } = useAmbiance(campaignId, initialState, playlists, isGM);

  const { blocked, localPlaying, toggle, unblock } = useAmbianceAudio({
    state,
    playlist,
    track,
    trackIndex,
    isGM,
    localVolume,
    commit,
  });

  const {
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
  } = useAmbiancePlaylists({
    campaignId,
    playlistId: state.playlistId,
    stateRef,
    commit,
    broadcastChanged,
    setError,
  });

  const playingLocal = isGM ? state.playing : localPlaying;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Barre de lecture ── */}
      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <AmbianceTransport
          playlistId={state.playlistId}
          isGM={isGM}
          playlists={playlists}
          playlist={playlist}
          track={track}
          trackIndex={trackIndex}
          blocked={blocked}
          playingLocal={playingLocal}
          jump={jump}
          toggle={toggle}
          selectScenePlaylist={selectScenePlaylist}
          unblock={unblock}
        />
        <AmbianceVolumes state={state} isGM={isGM} localVolume={localVolume} commit={commit} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* ── Création + liste (MJ, éditeur fermé) ── */}
      {isGM && !editId && (
        <AmbiancePlaylists
          playlists={playlists}
          playlistId={state.playlistId}
          newName={newName}
          setNewName={setNewName}
          pending={pending}
          submitNew={submitNew}
          startEdit={startEdit}
        />
      )}

      {/* ── Éditeur de playlist (MJ) ── */}
      {isGM && editId && (
        <AmbiancePlaylistEditor
          editId={editId}
          playlistId={state.playlistId}
          draftName={draftName}
          setDraftName={setDraftName}
          draftTracks={draftTracks}
          setDraftTracks={setDraftTracks}
          ntTitle={ntTitle}
          setNtTitle={setNtTitle}
          ntUrl={ntUrl}
          setNtUrl={setNtUrl}
          pending={pending}
          saveEdits={saveEdits}
          removePlaylist={removePlaylist}
          addTrack={addTrack}
          importTrack={importTrack}
          setEditId={setEditId}
        />
      )}
    </div>
  );
}
