import { parseOptions, tallyVotes } from "./vote-logic";

/** Cycle de vie d'un choix. `archived` = masqué de la liste active. */
export type ChoiceStatus = "open" | "closed" | "resolved" | "archived";

/** Données sérialisées d'un choix, servies par la page server et les actions. */
export interface ChoiceView {
  id: string;
  prompt: string;
  options: string[];
  status: ChoiceStatus;
  resolvedOption: number | null;
  createdAt: string;
  /** Dépouillement par index d'option. */
  counts: number[];
  /** Vote du joueur connecté (null = pas encore voté). */
  myVote: { optionIndex: number; comment: string | null } | null;
  /** Commentaires (MJ uniquement — rempli par la page côté serveur). */
  comments: { optionIndex: number; comment: string }[];
}

/** Ligne Prisma `playerChoice` + votes (le commentaire n'est lu que par le MJ). */
export type ChoiceRow = {
  id: string;
  prompt: string;
  options: unknown;
  status: string;
  resolvedOption: number | null;
  createdAt: Date;
  votes: { userId: string; optionIndex: number; comment?: string | null }[];
};

/** Sélection Prisma d'un choix complet ; le commentaire n'est lu que pour le MJ. */
export function choiceSelect(isGM: boolean) {
  return {
    id: true,
    prompt: true,
    options: true,
    status: true,
    resolvedOption: true,
    createdAt: true,
    votes: {
      select: { userId: true, optionIndex: true, ...(isGM ? { comment: true } : {}) },
    },
  };
}

export function isChoiceStatus(status: string): status is ChoiceStatus {
  return status === "open" || status === "closed" || status === "resolved" || status === "archived";
}

/** Ligne DB → vue client ; null si les options persistées sont corrompues. */
export function toChoiceView(row: ChoiceRow, userId: string, isGM: boolean): ChoiceView | null {
  const options = parseOptions(row.options);
  if (!options) return null;
  const mine = row.votes.find((v) => v.userId === userId);
  return {
    id: row.id,
    prompt: row.prompt,
    options,
    status: isChoiceStatus(row.status) ? row.status : "open",
    resolvedOption: row.resolvedOption,
    createdAt: row.createdAt.toISOString(),
    counts: tallyVotes(row.votes, options.length),
    myVote: mine ? { optionIndex: mine.optionIndex, comment: mine.comment ?? null } : null,
    // Les commentaires des autres ne quittent pas le serveur pour un joueur.
    comments: isGM
      ? row.votes.flatMap((v) =>
          v.comment ? [{ optionIndex: v.optionIndex, comment: v.comment }] : [],
        )
      : [],
  };
}
