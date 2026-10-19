import Link from "next/link";

type TriPanelLeftProps = {
  collapsed: boolean;
  width: number;
  campaignId?: string;
  onToggle: () => void;
  panel?: React.ReactNode;
};

/** Panneau gauche — arborescence Lore (rail replié ou aside). */
export function TriPanelLeft({ collapsed, width, campaignId, onToggle, panel }: TriPanelLeftProps) {
  return collapsed ? (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Ouvrir le panneau Lore"
      className="hidden w-8 shrink-0 flex-col items-center border-r border-border bg-card/50 py-4 text-muted transition hover:text-accent md:flex"
    >
      <span aria-hidden className="text-sm leading-none">
        ›
      </span>
    </button>
  ) : (
    <aside
      className="hidden w-[var(--panel-left)] shrink-0 flex-col overflow-y-auto border-r border-border bg-card/50 md:flex"
      style={{ "--panel-left": `${width}px` } as React.CSSProperties}
      aria-label="Arborescence Lore"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[0.65rem] font-medium tracking-[0.25em] text-muted uppercase">
          <span className="mark-tri" aria-hidden />
          Lore
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded
          aria-label="Réduire le panneau Lore"
          className="btn px-2 py-1 text-xs"
        >
          <span aria-hidden>‹</span>
        </button>
      </div>
      {panel ?? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-xs text-muted">
            Arborescence des notes — liens <code className="text-accent">[[bidirectionnels]]</code>
          </p>
          {campaignId && (
            <Link href={`/campaign/${campaignId}/wiki`} className="btn px-3 py-1.5 text-xs">
              Ouvrir le wiki
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}
