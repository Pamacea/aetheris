"use client";

import { useState, useTransition } from "react";
import { castVote, resolveChoice } from "./actions";
import type { ChoiceView } from "./choices-app";

/** Dépouillement visuel : barre + compteur (index clampé côté render). */
function VoteBar({ count, total }: { count: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <span className="flex items-center gap-2 text-xs whitespace-nowrap text-muted">
      <span className="relative block h-1.5 w-20 bg-border" aria-hidden>
        <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${pct}%` }} />
      </span>
      {count} vote{count > 1 ? "s" : ""}
    </span>
  );
}

/**
 * Un choix : vote (joueur, 1/upsert modifiable) et clôture (MJ),
 * les deux via server actions puis notification room.
 */
export function ChoiceCard({
  campaignId,
  choice,
  isGM,
  onMutated,
}: {
  campaignId: string;
  choice: ChoiceView;
  isGM: boolean;
  onMutated: () => void;
}) {
  const open = choice.status === "open";
  const [selected, setSelected] = useState<number | null>(choice.myVote?.optionIndex ?? null);
  const [comment, setComment] = useState(choice.myVote?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = choice.counts.reduce((sum, n) => sum + n, 0);
  // Les compteurs s'affichent dès qu'on a voté (ou après clôture) : ne pas
  // biaiser le vote en direct avant le premier choix.
  const showCounts = isGM || choice.myVote !== null || !open;

  function vote(e: React.FormEvent): void {
    e.preventDefault();
    if (selected === null) return;
    setError(null);
    const trimmed = comment.trim();
    startTransition(async () => {
      const res = await castVote(campaignId, choice.id, {
        optionIndex: selected,
        ...(trimmed === "" ? {} : { comment: trimmed }),
      });
      if (!res.ok) setError(res.error);
      else onMutated();
    });
  }

  function retain(index: number): void {
    const option = choice.options[index] ?? "";
    if (!window.confirm(`Clôturer ce choix avec l'option « ${option} » ?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await resolveChoice(campaignId, choice.id, { resolvedOption: index });
      if (!res.ok) setError(res.error);
      else onMutated();
    });
  }

  return (
    <article className="panel flex flex-col gap-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-lg leading-snug">{choice.prompt}</h3>
        <span
          className={`border px-2 py-0.5 text-[0.65rem] tracking-widest uppercase ${
            open ? "border-accent/60 text-accent" : "border-border text-muted"
          }`}
        >
          {open ? "Ouvert" : "Résolu"}
        </span>
      </header>

      <ul className="flex flex-col gap-2">
        {choice.options.map((option, index) => {
          const winner = !open && choice.resolvedOption === index;
          return (
            <li
              key={index}
              className={`flex flex-wrap items-center gap-3 border px-3 py-2 ${
                winner ? "border-accent bg-accent/10" : "border-border"
              }`}
            >
              {open ? (
                <label className="flex min-w-40 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name={`choice-${choice.id}`}
                    className="size-4 accent-[var(--accent)]"
                    checked={selected === index}
                    onChange={() => setSelected(index)}
                  />
                  <span className="flex-1 text-sm">{option}</span>
                  {showCounts && <VoteBar count={choice.counts[index] ?? 0} total={total} />}
                </label>
              ) : (
                <span className="flex min-w-40 flex-1 items-center gap-3 text-sm">
                  {winner && <span className="mark-tri" aria-hidden />}
                  <span className={winner ? "text-accent" : ""}>{option}</span>
                  {showCounts && (
                    <span className="ml-auto">
                      <VoteBar count={choice.counts[index] ?? 0} total={total} />
                    </span>
                  )}
                </span>
              )}

              {isGM && open && (
                <button
                  type="button"
                  className="btn border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
                  disabled={pending}
                  onClick={() => retain(index)}
                >
                  Retenir
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {open && (
        <form onSubmit={vote} className="flex flex-wrap items-end gap-3">
          <label className="flex basis-64 flex-1 flex-col gap-1 text-xs text-muted">
            Commentaire (optionnel)
            <input
              className="input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              placeholder="Une raison, une idée…"
              disabled={pending}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={pending || selected === null}>
            {choice.myVote ? "Modifier mon vote" : "Voter"}
          </button>
        </form>
      )}

      {isGM && choice.comments.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted">
          {choice.comments.map((c, i) => (
            <li key={i}>
              <span className="text-foreground">{choice.options[c.optionIndex] ?? "?"}</span>
              {" — "}
              {c.comment}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <footer className="flex flex-wrap justify-between gap-2 text-[0.65rem] tracking-widest text-muted uppercase">
        <span>{new Date(choice.createdAt).toLocaleDateString("fr-FR")}</span>
        <span className="flex gap-1">
          {!open && choice.resolvedOption !== null && (
            <span>Retenu : {choice.options[choice.resolvedOption] ?? "?"}</span>
          )}
          {showCounts && (
            <span>
              {!open && choice.resolvedOption !== null && "· "}
              {total} vote{total > 1 ? "s" : ""}
            </span>
          )}
        </span>
      </footer>
    </article>
  );
}
