type TriPanelRightProps = {
  collapsed: boolean;
  width: number;
  onToggle: () => void;
  panel?: React.ReactNode;
};

/** Panneau droit — chat / dés / inspecteur (rail replié ou aside). */
export function TriPanelRight({ collapsed, width, onToggle, panel }: TriPanelRightProps) {
  return collapsed ? (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Ouvrir le panneau Chat et dés"
      className="hidden w-8 shrink-0 flex-col items-center border-l border-border bg-card/50 py-4 text-muted transition hover:text-accent lg:flex"
    >
      <span aria-hidden className="text-sm leading-none">
        ‹
      </span>
    </button>
  ) : (
    <aside
      className="hidden w-[var(--panel-right)] shrink-0 flex-col overflow-y-auto border-l border-border bg-card/50 lg:flex"
      style={{ "--panel-right": `${width}px` } as React.CSSProperties}
      aria-label="Chat et dés"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[0.65rem] font-medium tracking-[0.25em] text-muted uppercase">
          <span className="mark-tri" aria-hidden />
          Chat &amp; Dés
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded
          aria-label="Réduire le panneau Chat et dés"
          className="btn px-2 py-1 text-xs"
        >
          <span aria-hidden>›</span>
        </button>
      </div>
      {panel ?? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-xs text-muted">
            Theatre of the Mind — messages, jets de dés synchronisés
          </p>
        </div>
      )}
    </aside>
  );
}
