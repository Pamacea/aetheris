/**
 * Icônes SVG maison du studio d'écriture — l'UI n'affiche jamais de glyphe
 * unicode (emoji, ✕, ⠿…), uniquement du SVG discret ou `mark-tri`.
 */
export function IconCross({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function IconChevronLeft({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}

/** Poignée de drag (six points) pour le réordonnancement des chapitres. */
export function IconGrip({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      {[5, 8, 11].map((y) => (
        <g key={y}>
          <circle cx="5.5" cy={y} r="1.2" />
          <circle cx="10.5" cy={y} r="1.2" />
        </g>
      ))}
    </svg>
  );
}
