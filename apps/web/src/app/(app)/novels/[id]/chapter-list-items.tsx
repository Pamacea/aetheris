"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "../status-badge";
import { IconGrip } from "../icons";
import { nextChapterStatus as nextStatus } from "@/features/novels/logic";
import type { ChapterRow } from "./chapter-list";

interface ChapterListItemsProps {
  novelId: string;
  rows: ChapterRow[];
  pending: boolean;
  editingId: string | null;
  draftTitle: string;
  dragId: { current: string | null };
  setEditingId: (id: string | null) => void;
  setDraftTitle: (title: string) => void;
  onCommitRename: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onRemove: (id: string) => void;
  onDrop: (targetId: string) => void;
  onAdd: (title?: string) => void;
}

/**
 * Arbre de chapitres : création rapide (Entrée), titre éditable en direct,
 * double-clic = ouverture de l'éditeur, drag HTML5, menu contextuel clic
 * droit (renommer, statut suivant, supprimer).
 */
export function ChapterListItems({
  novelId,
  rows,
  pending,
  editingId,
  draftTitle,
  dragId,
  setEditingId,
  setDraftTitle,
  onCommitRename,
  onStatusChange,
  onRemove,
  onDrop,
  onAdd,
}: ChapterListItemsProps) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const submitAdd = () => {
    onAdd(newTitle);
    setNewTitle("");
  };

  return (
    <>
      <ul className="flex flex-col border-l border-border pl-1">
        {rows.map((c, i) => (
          <li
            key={c.id}
            draggable={!pending && editingId !== c.id}
            onDragStart={() => {
              dragId.current = c.id;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(c.id)}
            onDoubleClick={() => {
              if (editingId !== c.id) router.push(`/novels/${novelId}/chapters/${c.id}`);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ id: c.id, x: e.clientX, y: e.clientY });
            }}
            className="group flex flex-wrap items-center gap-3 border-b border-border px-2 py-2.5 transition hover:bg-card-hover"
          >
            <span
              className="cursor-grab text-muted group-hover:text-accent"
              title="Glisser pour réordonner"
            >
              <IconGrip />
            </span>
            <span className="w-6 text-right text-xs text-muted">{i + 1}</span>

            {editingId === c.id ? (
              <input
                name="titre-chapitre"
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={() => onCommitRename(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setDraftTitle(c.title);
                    setEditingId(null);
                  }
                }}
                className="input min-w-0 flex-1 text-sm"
                aria-label={`Titre du chapitre ${i + 1}`}
                maxLength={200}
              />
            ) : (
              <Link
                href={`/novels/${novelId}/chapters/${c.id}`}
                draggable={false}
                className="min-w-0 flex-1 truncate text-sm hover:text-accent"
                title="Double-cliquer pour écrire"
              >
                {c.title}
              </Link>
            )}

            <span className="hidden text-[0.65rem] text-muted sm:inline">
              {c.wordCount.toLocaleString("fr-FR")} mots
            </span>
            <StatusBadge status={c.status} kind="chapter" />
          </li>
        ))}

        <li className="flex items-center gap-3 px-2 py-2.5">
          <span className="w-6 text-right text-xs text-muted" aria-hidden>
            {rows.length + 1}
          </span>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitAdd();
            }}
            placeholder="Titre du nouveau chapitre — Entrée pour ajouter"
            aria-label="Titre du nouveau chapitre"
            maxLength={200}
            className="input min-w-0 flex-1 text-sm"
          />
          <button
            type="button"
            onClick={submitAdd}
            disabled={pending}
            className="btn px-3 py-1.5 text-xs"
          >
            + Ajouter
          </button>
        </li>
      </ul>

      {menu && (
        <div
          role="menu"
          aria-label="Actions du chapitre"
          onPointerDown={(e) => e.stopPropagation()}
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-50 flex min-w-44 flex-col border border-border bg-background py-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        >
          <button
            type="button"
            role="menuitem"
            autoFocus
            className="px-3 py-1.5 text-left text-xs text-muted hover:bg-card-hover hover:text-foreground"
            onClick={() => {
              const row = rows.find((r) => r.id === menu.id);
              if (row) {
                setDraftTitle(row.title);
                setEditingId(row.id);
              }
              setMenu(null);
            }}
          >
            Renommer
          </button>
          <button
            type="button"
            role="menuitem"
            className="px-3 py-1.5 text-left text-xs text-muted hover:bg-card-hover hover:text-foreground"
            onClick={() => {
              const row = rows.find((r) => r.id === menu.id);
              if (row) onStatusChange(row.id, nextStatus(row.status).value);
              setMenu(null);
            }}
          >
            Statut suivant :{" "}
            {nextStatus(rows.find((r) => r.id === menu.id)?.status ?? "draft").label}
          </button>
          <button
            type="button"
            role="menuitem"
            className="px-3 py-1.5 text-left text-xs text-destructive hover:bg-card-hover"
            onClick={() => {
              onRemove(menu.id);
              setMenu(null);
            }}
          >
            Supprimer
          </button>
        </div>
      )}
    </>
  );
}
