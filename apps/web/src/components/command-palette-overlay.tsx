import type { Command } from "./command-palette-commands";

const LIST_ID = "palette-commandes";

type CommandPaletteOverlayProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  listRef: React.RefObject<HTMLUListElement | null>;
  filtered: Command[];
  activeClamped: number;
  onExecute: (command: Command) => void;
  onActiveChange: (index: number) => void;
  onClose: () => void;
};

export function CommandPaletteOverlay({
  query,
  onQueryChange,
  onKeyDown,
  inputRef,
  listRef,
  filtered,
  activeClamped,
  onExecute,
  onActiveChange,
  onClose,
}: CommandPaletteOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes"
    >
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="panel relative w-[min(92vw,480px)] p-2">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="mark-tri" aria-hidden />
          <input
            ref={inputRef}
            name="recherche-commande"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tapez une commande…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            role="combobox"
            aria-label="Rechercher une commande"
            aria-expanded={filtered.length > 0}
            aria-controls={LIST_ID}
            aria-activedescendant={
              filtered.length ? `${LIST_ID}-${filtered[activeClamped].id}` : undefined
            }
            aria-autocomplete="list"
          />
        </div>
        <ul
          ref={listRef}
          id={LIST_ID}
          role="listbox"
          aria-label="Commandes"
          className="mt-1 max-h-72 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <li
              role="option"
              aria-disabled="true"
              aria-selected={false}
              className="px-3 py-6 text-center text-sm text-muted"
            >
              Aucune commande.
            </li>
          ) : (
            filtered.map((c, i) => (
              <li
                key={c.id}
                id={`${LIST_ID}-${c.id}`}
                role="option"
                aria-selected={i === activeClamped}
                onClick={() => onExecute(c)}
                onMouseEnter={() => onActiveChange(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                  i === activeClamped
                    ? "bg-card-hover text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className={i === activeClamped ? "mark-tri" : "opacity-0"} />
                  {c.label}
                </span>
                <span className="text-[0.65rem] tracking-widest text-muted uppercase">
                  {c.hint}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
