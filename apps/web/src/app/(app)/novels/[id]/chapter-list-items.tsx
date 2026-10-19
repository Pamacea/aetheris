"use client";

import Link from "next/link";
import { CycleStatus } from "@/components/cycle-status";
import { IconCross, IconGrip } from "../icons";
import type { ChapterRow } from "./chapter-list";

/** Cycle du statut d'un chapitre : un clic = état suivant (pas de select). */
const CHAPTER_STATES = [
  { value: "draft", label: "Brouillon" },
  { value: "review", label: "En écriture" },
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
 * Corps de la liste de chapitres : état vide, lignes avec titre éditable en
 * direct (input, commit au blur/Enter), drag de réordonnancement (HTML5
 * natif — désactivé sur la ligne en édition), statut cyclique et suppression.
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
              className="group flex flex-wrap items-center gap-3 border-b border-border px-2 py-2.5 transition hover:bg-card-hover"
            >
              <span
                className="cursor-grab text-muted group-hover:text-accent"
                title="Glisser pour réordonner"
              >
                <IconGrip />
              </span>
              <span className="w-6 text-right text-xs text-muted">{i + 1}</span>

              <input
                name="titre-chapitre"
                value={editingId === c.id ? draftTitle : c.title}
                onChange={(e) => setDraftTitle(e.target.value)}
                onFocus={() => {
                  // Désactive le drag le temps de l'édition (sauf refocus).
                  if (editingId !== c.id) {
                    setEditingId(c.id);
                    setDraftTitle(c.title);
                  }
                }}
                onBlur={() => onCommitRename(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  // Échap : annule la saisie (le brouillon repart du titre serveur).
                  if (e.key === "Escape") setDraftTitle(c.title);
                }}
                className="input min-w-0 flex-1 text-sm"
                aria-label={`Titre du chapitre ${i + 1}`}
                maxLength={200}
              />

              <span className="hidden text-[0.65rem] text-muted sm:inline">
                {c.wordCount.toLocaleString("fr-FR")} mots
              </span>

              <CycleStatus
                states={CHAPTER_STATES}
                current={c.status}
                onCycle={(next) => onStatusChange(c.id, next)}
                legend={`Statut de ${c.title}`}
              />

              <span className="flex items-center gap-1">
                <Link
                  href={`/novels/${novelId}/chapters/${c.id}`}
                  className="btn px-2 py-2.5 text-xs"
                >
                  Écrire
                </Link>
                <button
                  type="button"
                  onClick={() => onRemove(c.id)}
                  disabled={pending}
                  aria-label={`Supprimer ${c.title}`}
                  className="btn px-2 py-2.5 text-xs"
                >
                  <IconCross />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
