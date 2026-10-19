"use client";

/**
 * Bouton d'état cyclique — remplace les <select> de statut/rôle :
 * un clic = état suivant (Brouillon → En écriture → Publié → …).
 * Hauteur pilotée par `className` pour s'aligner sur le container.
 */
export function CycleStatus({
  states,
  current,
  onCycle,
  className = "",
  legend,
}: {
  states: readonly { value: string; label: string }[];
  current: string;
  onCycle: (next: string) => void;
  className?: string;
  /** Texte d'aide lu par les lecteurs d'écran (ex : « Statut du roman »). */
  legend?: string;
}) {
  const idx = states.findIndex((s) => s.value === current);
  const state = states[idx < 0 ? 0 : idx];
  const next = states[(idx + 1) % states.length];
  if (!state || !next) return null;

  return (
    <button
      type="button"
      onClick={() => onCycle(next.value)}
      title={`${legend ?? "État"} : ${state.label} — cliquer pour passer en ${next.label}`}
      aria-label={`${legend ?? "État"} : ${state.label}. Cliquer pour passer en ${next.label}`}
      className={`btn cursor-pointer px-5 text-xs whitespace-nowrap ${className}`}
    >
      {state.label}
    </button>
  );
}
