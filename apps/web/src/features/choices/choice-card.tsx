"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { archiveChoice, castVote, closeChoice, resolveChoice } from "./actions";
import type { ChoiceStatus, ChoiceView } from "./choice-view";

/** Échec de transport de l'action : message local plutôt que l'error boundary. */
const NETWORK_ERROR = "Connexion perdue — réessayez.";

const STATUS_LABELS: Record<ChoiceStatus, string> = {
  open: "Ouvert",
  closed: "Fermé",
  resolved: "Résolu",
  archived: "Archivé",
};

type PendingConfirm =
  | { kind: "resolve"; index: number }
  | { kind: "close" }
  | { kind: "archive" }
  | null;

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
 * Un choix : vote (joueur, 1/upsert modifiable), clôture (MJ, avec ou sans
 * option retenue) et archivage (MJ) — chaque action renvoie la vue à jour,
 * l'appelant met la liste à jour sans re-render serveur.
 */
export function ChoiceCard({
  campaignId,
  choice,
  isGM,
  onUpdated,
}: {
  campaignId: string;
  choice: ChoiceView;
  isGM: boolean;
  onUpdated: (choice: ChoiceView) => void;
}) {
  const open = choice.status === "open";
  const [selected, setSelected] = useState<number | null>(choice.myVote?.optionIndex ?? null);
  const [comment, setComment] = useState(choice.myVote?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const [pending, startTransition] = useTransition();

  const total = choice.counts.reduce((sum, n) => sum + n, 0);
  // Les compteurs s'affichent dès qu'on a voté (ou après clôture) : ne pas
  // biaiser le vote en direct avant le premier choix.
  const showCounts = isGM || choice.myVote !== null || !open;

  function run(
    action: () => Promise<{ ok: true; choice: ChoiceView } | { ok: false; error: string }>,
    onSettled?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (!res.ok) setError(res.error);
        else onUpdated(res.choice);
      } catch {
        setError(NETWORK_ERROR);
      } finally {
        onSettled?.();
      }
    });
  }

  function vote(e: React.FormEvent): void {
    e.preventDefault();
    if (selected === null) return;
    const trimmed = comment.trim();
    run(() =>
      castVote(campaignId, choice.id, {
        optionIndex: selected,
        ...(trimmed === "" ? {} : { comment: trimmed }),
      }),
    );
  }

  function confirm(): void {
    if (!pendingConfirm) return;
    const current = pendingConfirm;
    run(
      () =>
        current.kind === "resolve"
          ? resolveChoice(campaignId, choice.id, { resolvedOption: current.index })
          : current.kind === "close"
            ? closeChoice(campaignId, choice.id)
            : archiveChoice(campaignId, choice.id),
      () => setPendingConfirm(null),
    );
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
          {STATUS_LABELS[choice.status]}
        </span>
      </header>

      <ul className="flex flex-col gap-2">
        {choice.options.map((option, index) => {
          const winner = choice.status === "resolved" && choice.resolvedOption === index;
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
                  onClick={() => setPendingConfirm({ kind: "resolve", index })}
                >
                  Retenir
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {isGM && (
        <div className="flex flex-wrap gap-2">
          {open && (
            <button
              type="button"
              className="btn px-3 py-1.5 text-xs"
              disabled={pending}
              onClick={() => setPendingConfirm({ kind: "close" })}
            >
              Fermer
            </button>
          )}
          {!open && choice.status !== "archived" && (
            <button
              type="button"
              className="btn px-3 py-1.5 text-xs"
              disabled={pending}
              onClick={() => setPendingConfirm({ kind: "archive" })}
            >
              Archiver
            </button>
          )}
        </div>
      )}

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
          {choice.status === "resolved" && choice.resolvedOption !== null && (
            <span>Retenu : {choice.options[choice.resolvedOption] ?? "?"}</span>
          )}
          {showCounts && (
            <span>
              {choice.status === "resolved" && choice.resolvedOption !== null && "· "}
              {total} vote{total > 1 ? "s" : ""}
            </span>
          )}
        </span>
      </footer>

      <ConfirmDialog
        open={pendingConfirm !== null}
        title={
          pendingConfirm?.kind === "resolve"
            ? `Clôturer ce choix avec l'option « ${choice.options[pendingConfirm.index] ?? ""} » ?`
            : pendingConfirm?.kind === "close"
              ? "Fermer ce choix sans retenir d'option ?"
              : "Archiver ce choix ?"
        }
        description={
          pendingConfirm?.kind === "resolve"
            ? undefined
            : pendingConfirm?.kind === "close"
              ? "Les votes seront clos."
              : "Il sortira de l'historique actif."
        }
        confirmLabel={
          pendingConfirm?.kind === "resolve"
            ? "Retenir"
            : pendingConfirm?.kind === "close"
              ? "Fermer"
              : "Archiver"
        }
        danger={pendingConfirm?.kind === "archive"}
        pending={pending}
        onConfirm={confirm}
        onClose={() => setPendingConfirm(null)}
      />
    </article>
  );
}
