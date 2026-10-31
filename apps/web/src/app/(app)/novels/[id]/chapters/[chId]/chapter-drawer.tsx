"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { StatusBadge } from "../../../status-badge";
import { IconCross } from "../../../icons";

interface DrawerChapter {
  id: string;
  title: string;
  status: string;
}

/**
 * Tiroir latéral des chapitres — overlay avec backdrop flouté : il se
 * superpose à l'éditeur sans écraser la zone de texte. Le panneau reste
 * monté et coulisse via `translate-x`.
 */
export function ChapterDrawer({
  novelId,
  currentChapterId,
  chapters,
  open,
  onClose,
}: {
  novelId: string;
  currentChapterId: string;
  chapters: DrawerChapter[];
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        aria-label="Fermer le panneau des chapitres"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="chapter-drawer"
        aria-label="Chapitres du roman"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col border-r border-border bg-background shadow-[8px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            <span className="mark-tri" aria-hidden />
            Chapitres
          </h2>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="Fermer le panneau des chapitres"
            className="btn px-2 py-2 text-xs"
          >
            <IconCross />
          </button>
        </div>

        <nav aria-label="Chapitres" className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="flex flex-col">
            {chapters.map((c) => {
              const current = c.id === currentChapterId;
              return (
                <li key={c.id}>
                  <Link
                    href={`/novels/${novelId}/chapters/${c.id}`}
                    onClick={onClose}
                    aria-current={current ? "page" : undefined}
                    className={`flex items-center justify-between gap-2 border-b border-border px-2 py-2 text-sm transition hover:bg-card-hover ${
                      current ? "text-accent" : "text-muted hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                    <StatusBadge status={c.status} kind="chapter" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
