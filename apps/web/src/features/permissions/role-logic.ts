/**
 * Règles de changement de rôle — logique pure, testée ici puis appliquée
 * par `setMemberRole` (server action réservée aux MJ).
 */

export interface RoleChangeInput {
  actorRole: string;
  /** userId du membre qui agit / de la cible (une adhésion par user+campagne). */
  actorUserId: string;
  targetUserId: string;
  targetRole: string;
  nextRole: "GM" | "PLAYER";
  /** Nombre de MJ de la campagne avant changement. */
  gmCount: number;
}

/** Raison du refus, null = écriture autorisée (null aussi si no-op). */
export function roleChangeError(i: RoleChangeInput): string | null {
  if (i.actorRole !== "GM") return "Réservé aux MJ.";
  if (i.nextRole === i.targetRole) return null;
  if (i.targetUserId === i.actorUserId && i.nextRole === "PLAYER") {
    return "Impossible de rétrograder son propre rôle.";
  }
  if (i.targetRole === "GM" && i.nextRole === "PLAYER" && i.gmCount <= 1) {
    return "Impossible de rétrograder le dernier MJ.";
  }
  return null;
}
