/**
 * Grants de vue — logique pure, testée ici puis appliquée par
 * `setMemberViewGrant` (server action réservée aux MJ).
 * Seul le refus est stocké : `{ view: { [moduleId]: false } }`,
 * l'absence de clé = accès par défaut (relu par `lib/canViewModule`).
 */

const MODULE_ID_RE = /^[a-z][a-z0-9-]{0,31}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Raison du refus de l'écriture, null = acceptable. */
export function viewGrantError(moduleId: string, targetRole: string): string | null {
  if (!MODULE_ID_RE.test(moduleId)) return "Module invalide.";
  if (targetRole === "GM") return "Le MJ voit toujours tout.";
  return null;
}

/** Applique view=false (refus persisté) ou view=true (clé supprimée → défaut),
 * en préservant les autres clés du JSON de permissions. */
export function applyViewGrant(
  permissions: unknown,
  moduleId: string,
  view: boolean,
): Record<string, unknown> {
  const perms = isRecord(permissions) ? permissions : {};
  const viewRecord = isRecord(perms.view) ? perms.view : {};
  const nextView: Record<string, unknown> = { ...viewRecord };
  if (view) delete nextView[moduleId];
  else nextView[moduleId] = false;
  return { ...perms, view: nextView };
}
