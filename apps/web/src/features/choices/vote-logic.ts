/**
 * Logique pure du vote (bornes, dépouillement) — testable sans DB.
 * La persistance reste chez Prisma (upsert sur @@unique([choiceId,userId])).
 */

/** `options` Json Prisma → libellés valides (2..6, non vides) ; null si forme invalide. */
export function parseOptions(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 6) return null;
  const options = raw.map((o) => (typeof o === "string" ? o.trim() : ""));
  if (options.some((o) => o.length === 0 || o.length > 120)) return null;
  return options;
}

/**
 * Clamp d'index d'option dans [0, optionCount-1].
 * shortcut: un index hors bornes est ramené à l'option la plus proche
 * (jamais rejeté) ; passer à un rejet strict si le cas se présente.
 */
export function clampOptionIndex(index: number, optionCount: number): number | null {
  if (!Number.isFinite(index) || optionCount < 1) return null;
  return Math.min(Math.max(Math.trunc(index), 0), optionCount - 1);
}

/**
 * Dépouillement : un vote par joueur (unicité défensive, dernier vote
 * gagnant = modification), compté par index d'option ; index hors bornes
 * clampé. Chaque entrée de `votes` est une ligne ChoiceVote.
 */
export function tallyVotes(
  votes: { userId: string; optionIndex: number }[],
  optionCount: number,
): number[] {
  const counts = Array.from({ length: Math.max(0, optionCount) }, () => 0);
  const latest = new Map<string, number>();
  for (const vote of votes) latest.set(vote.userId, vote.optionIndex);
  for (const index of latest.values()) {
    const clamped = clampOptionIndex(index, optionCount);
    if (clamped !== null) counts[clamped] = (counts[clamped] ?? 0) + 1;
  }
  return counts;
}
