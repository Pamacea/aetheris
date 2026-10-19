"use client";

import type { CSSProperties } from "react";
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

/** Curseur stylé : piste accent + vide, pouce carré à angle taillé (jamais de
 *  radius). `--fill` pilote le remplissage de la piste WebKit (Firefox a
 *  ::-moz-range-progress natif). */
const SLIDER_CLS = [
  "h-5 w-36 shrink-0 cursor-pointer appearance-none bg-transparent",
  "[&::-webkit-slider-runnable-track]:h-1.5",
  "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--accent)_var(--fill),var(--border)_var(--fill))]",
  "[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-2.5",
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-[var(--accent)]",
  "[&::-webkit-slider-thumb]:[clip-path:polygon(0_0,calc(100%_-_4px)_0,100%_4px,100%_100%,0_100%)]",
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-[var(--border)]",
  "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:bg-[var(--accent)]",
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:border-0",
  "[&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:bg-[var(--accent)]",
  "[&::-moz-range-thumb]:[clip-path:polygon(0_0,calc(100%_-_4px)_0,100%_4px,100%_100%,0_100%)]",
].join(" ");

/** Ligne compacte : libellé · curseur · pourcentage (valeur en chiffres tabulaires). */
function VolumeRow({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(value * 100);
  return (
    <label className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[0.65rem] font-semibold tracking-widest whitespace-nowrap text-muted uppercase">
        {label}
      </span>
      <input
        type="range"
        name={name}
        min={0}
        max={1}
        step={0.05}
        value={value}
        // shortcut: un commit serveur + relais par tick de slider (step 0.05),
        //           sans debounce ; le gateway relaie à 5/s, un tick au-delà est
        //           perdu (les pairs rattrapent au prochain commit).
        onChange={(e) => onChange(Number(e.target.value))}
        className={SLIDER_CLS}
        style={{ "--fill": `${pct}%` } as CSSProperties}
        aria-label={label}
      />
      <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-accent">
        {pct}%
      </span>
    </label>
  );
}

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
      <div className="panel flex flex-col gap-2 p-2.5 pr-3">
        {isGM && (
          <VolumeRow
            label="Volume global"
            name="volume-global"
            value={state.volume}
            // shortcut: relais par tick — voir VolumeRow.
            onChange={(v) => void commit({ ...state, volume: v })}
          />
        )}
        <VolumeRow
          label="Mon volume"
          name="volume-local"
          value={localVolume}
          onChange={writeLocalVolume}
        />
      </div>

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
    </>
  );
}
