"use client";

import Link from "next/link";
import { StatusBadge } from "../status-badge";
import type { ChapterRow } from "./chapter-list";

const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon" },
  { value: "review", label: "Relecture" },
  { value: "published", label: "Publié" },
] as const;

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
}

/**
 * Corps de la liste de chapitres : état vide, lignes avec rename inline,
 * drag de réordonnancement (HTML5 natif), statut et suppression.
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
}: ChapterListItemsProps) {
  return (
    <>
      {rows.length === 0 ? (
        <p className="panel px-4 py-8 text-center text-sm text-muted">
          Aucun chapitre — créez le premier pour commencer à écrire.
        </p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((c, i) => (
            <li
              key={c.id}
              draggable={!pending && editingId !== c.id}
              onDragStart={() => {
                dragId.current = c.id;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(c.id)}
              className="group flex items-center gap-3 border-b border-border px-2 py-2.5 hover:bg-card-hover"
            >
              <span
                aria-hidden
                className="cursor-grab text-xs text-muted group-hover:text-accent"
                title="Glisser pour réordonner"
              >
                ⠿
              </span>
              <span className="w-6 text-right text-xs text-muted">{i + 1}</span>

              {editingId === c.id ? (
                <input
                  autoFocus
                  name="titre-chapitre"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onBlur={() => onCommitRename(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommitRename(c.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="input min-w-0 flex-1 py-1 text-sm"
                  aria-label="Titre du chapitre"
                  maxLength={200}
                />
              ) : (
                <Link
                  href={`/novels/${novelId}/chapters/${c.id}`}
                  className="min-w-0 flex-1 truncate text-sm hover:text-accent"
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    setEditingId(c.id);
                    setDraftTitle(c.title);
                  }}
                  title="Cliquer pour écrire · double-cliquer pour renommer"
                >
                  {c.title}
                </Link>
              )}

              <span className="hidden text-[0.65rem] text-muted sm:inline">
                {c.wordCount.toLocaleString("fr-FR")} mots
              </span>

              <select
                name={`chapitre-${c.id}-statut`}
                value={c.status}
                onChange={(e) => onStatusChange(c.id, e.target.value)}
                aria-label={`Statut de ${c.title}`}
                className="input w-auto py-0.5 text-[0.7rem]"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <StatusBadge status={c.status} kind="chapter" />

              <span className="flex items-center gap-1">
                <Link
                  href={`/novels/${novelId}/chapters/${c.id}`}
                  className="btn px-2 py-0.5 text-xs"
                >
                  Écrire
                </Link>
                <button
                  type="button"
                  onClick={() => onRemove(c.id)}
                  disabled={pending}
                  aria-label={`Supprimer ${c.title}`}
                  className="btn px-2 py-0.5 text-xs"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
