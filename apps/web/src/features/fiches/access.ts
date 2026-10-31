import type { CampaignRole } from "@aetheris/shared";

export type EntityAccess = {
  /** Rôle du lecteur (GM = MJ, PLAYER = joueur). */
  role: CampaignRole;
  /** Joueurs assignés à la fiche. */
  assigneeIds: readonly string[];
  gmOnly: boolean;
};

/**
 * Écriture d'une fiche : MJ toujours ; joueur uniquement si la fiche lui est
 * assignée ET n'est pas secrète. Une fiche sans assigné reste MJ seule.
 */
export function canEditEntity(entity: EntityAccess, userId: string): boolean {
  if (entity.role === "GM") return true;
  return !entity.gmOnly && entity.assigneeIds.includes(userId);
}

/**
 * Filtre Prisma de la liste des fiches : le MJ voit tout, le joueur voit les
 * fiches non-MJ sans assigné (lecture seule) ou dont il est assigné.
 */
export function visibleEntityWhere(role: CampaignRole, userId: string) {
  if (role === "GM") return {};
  return {
    gmOnly: false as const,
    OR: [{ assignees: { none: {} } }, { assignees: { some: { userId } } }],
  };
}
