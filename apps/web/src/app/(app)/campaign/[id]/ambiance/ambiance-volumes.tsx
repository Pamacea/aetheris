"use client";

import type { AmbianceState } from "@aetheris/shared";

/** Préférence de volume personnel, propre à chaque client. */
const LOCAL_VOLUME_KEY = "aetheris:ambiance:volume";
const DEFAULT_LOCAL_VOLUME = 0.8;
const localVolumeListeners = new Set<() => void>();

/** Snapshot localStorage : borné [0,1], défaut 0.8 si absent ou illisible. */
export function readLocalVolume(): number {
  const v = Number(localStorage.getItem(LOCAL_VOLUME_KEY) ?? "NaN");
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_LOCAL_VOLUME;
}

export function subscribeLocalVolume(listener: () => void): () => void {
  localVolumeListeners.add(listener);
  return () => {
    localVolumeListeners.delete(listener);
  };
}

/** Pas d'événement `storage` dans le même onglet : notification manuelle. */
function writeLocalVolume(v: number): void {
  // Écriture dans le handler (jamais au montage) : ne pas écraser avant lecture.
  localStorage.setItem(LOCAL_VOLUME_KEY, String(v));
  for (const notify of localVolumeListeners) notify();
}

export { DEFAULT_LOCAL_VOLUME };

/** Curseurs de volume (global + boucle pilotés par le MJ, volume local). */
export function AmbianceVolumes({
  state,
  isGM,
  localVolume,
  commit,
}: {
  state: AmbianceState;
  isGM: boolean;
  localVolume: number;
  commit: (next: AmbianceState) => Promise<void>;
}) {
  return (
    <>
      {isGM && (
        <label className="flex items-center gap-2 text-xs text-muted">
          Volume global
          <input
            type="range"
            name="volume-global"
            min={0}
            max={1}
            step={0.05}
            value={state.volume}
            // shortcut: un commit serveur + broadcast par tick de slider (step
            //           0.05), sans debounce — alléger si la persistance pèse.
            onChange={(e) => void commit({ ...state, volume: Number(e.target.value) })}
            className="w-28 accent-[var(--accent)]"
            aria-label="Volume global"
          />
        </label>
      )}

      {isGM && (
        <button
          type="button"
          className={
            state.loop ? "btn border-accent px-2 py-1 text-xs text-accent" : "btn px-2 py-1 text-xs"
          }
          aria-pressed={state.loop}
          onClick={() => void commit({ ...state, loop: !state.loop })}
        >
          ⟳ Boucle
        </button>
      )}

      <label className="flex items-center gap-2 text-xs text-muted">
        Mon volume
        <input
          type="range"
          name="volume-local"
          min={0}
          max={1}
          step={0.05}
          value={localVolume}
          onChange={(e) => writeLocalVolume(Number(e.target.value))}
          className="w-28 accent-[var(--accent)]"
          aria-label="Mon volume"
        />
      </label>
    </>
  );
}
