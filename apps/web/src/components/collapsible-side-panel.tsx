"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/** Repli persisté d'un panneau, lu comme source externe (`localStorage`).
 *  Le snapshot serveur est toujours déplié : aucun mismatch d'hydratation. */
const listeners = new Set<() => void>();
const memory = new Map<string, boolean>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readCollapsed(key: string): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) return raw === "true";
  } catch {
    // localStorage indisponible (navigation privée) : repli mémoire.
  }
  return memory.get(key) ?? false;
}

function writeCollapsed(key: string, next: boolean) {
  memory.set(key, next);
  try {
    window.localStorage.setItem(key, String(next));
  } catch {
    // Idem : le repli reste fonctionnel pour la session.
  }
  for (const listener of listeners) listener();
}

export function usePersistedCollapse(key: string) {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => readCollapsed(key),
    () => false,
  );
  const toggle = useCallback(() => writeCollapsed(key, !readCollapsed(key)), [key]);
  return [collapsed, toggle] as const;
}

/**
 * Panneau latéral repliable : rail étroit (bouton Déplier) ou panneau complet
 * avec bouton Replier. Le contenu reste monté quand il est replié (`hidden`)
 * pour conserver recherche et formulaire, sans piège de focus.
 */
export function CollapsibleSidePanel({
  id,
  label,
  side,
  collapsed,
  onToggle,
  width = "w-60",
  className = "",
  children,
}: {
  id: string;
  label: string;
  side: "left" | "right";
  collapsed: boolean;
  onToggle: () => void;
  width?: string;
  className?: string;
  children: ReactNode;
}) {
  const contentId = `${id}-content`;
  const ExpandIcon = side === "left" ? ChevronRightIcon : ChevronLeftIcon;
  const CollapseIcon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <aside
      id={id}
      aria-label={label}
      className={`flex shrink-0 flex-col overflow-hidden bg-card ${
        side === "left" ? "border-r" : "border-l"
      } border-border ${collapsed ? "w-9" : width} ${className}`}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-controls={contentId}
          aria-label={`Déplier ${label}`}
          title={`Déplier ${label}`}
          className="flex h-9 w-full items-center justify-center text-muted transition hover:bg-card-hover hover:text-foreground"
        >
          <ExpandIcon className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border pr-1 pl-3">
          <p className="truncate text-[0.65rem] tracking-widest text-muted uppercase">{label}</p>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded
            aria-controls={contentId}
            aria-label={`Replier ${label}`}
            title={`Replier ${label}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center text-muted transition hover:bg-card-hover hover:text-foreground"
          >
            <CollapseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        id={contentId}
        className={collapsed ? "hidden" : "flex min-h-0 flex-1 flex-col overflow-hidden"}
      >
        {children}
      </div>
    </aside>
  );
}
