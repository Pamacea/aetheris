"use client";

import type { Dispatch, SetStateAction } from "react";
import type { AudioTrack } from "@aetheris/shared";
import { removeTrackAt } from "./track-logic";

/** Liste éditable des pistes d'une playlist (MJ). */
export function AmbianceTrackList({
  draftTracks,
  setDraftTracks,
}: {
  draftTracks: AudioTrack[];
  setDraftTracks: Dispatch<SetStateAction<AudioTrack[]>>;
}) {
  return (
    <ul className="divide-y divide-border border border-border">
      {draftTracks.map((t, i) => (
        <li key={t.id} className="flex items-center gap-2 px-2 py-1.5">
          <span className="w-6 text-xs text-muted">{i + 1}</span>
          <input
            className="input min-w-0 flex-1 py-1 text-xs"
            name={`piste-${i}-titre`}
            value={t.title}
            maxLength={160}
            aria-label={`Titre de la piste ${i + 1}`}
            onChange={(e) =>
              setDraftTracks((ds) =>
                ds.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
              )
            }
          />
          {t.url.startsWith("data:") ? (
            // Fichier importé : la data-URI (jusqu'à ~1 Mo) ne va pas dans un
            // champ éditable — on l'affiche en lecture seule, suppression pour
            // remplacer. Les URLs distantes restent éditables ci-dessous.
            <span
              className="w-64 shrink-0 truncate border border-border px-2 py-1 text-xs text-muted"
              title="Fichier importé — supprimez la piste pour en importer un autre"
            >
              Fichier importé
            </span>
          ) : (
            <input
              className="input w-64 py-1 text-xs"
              name={`piste-${i}-url`}
              value={t.url}
              maxLength={2048}
              placeholder="https://…/piste.mp3"
              aria-label={`URL de la piste ${i + 1}`}
              onChange={(e) =>
                setDraftTracks((ds) =>
                  ds.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                )
              }
            />
          )}
          <button
            type="button"
            className="border border-border px-2 text-xs text-muted hover:border-destructive hover:text-destructive"
            onClick={() => setDraftTracks((ds) => removeTrackAt(ds, i))}
            aria-label={`Retirer la piste ${t.title}`}
          >
            ✕
          </button>
        </li>
      ))}
      {draftTracks.length === 0 && (
        <li className="px-2 py-2 text-xs text-muted">Aucune piste — ajoutez-en une ci-dessous.</li>
      )}
    </ul>
  );
}
