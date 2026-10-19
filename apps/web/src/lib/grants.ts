/**
 * Grants de vue (Phase 10 — permissions persistées sur `CampaignMember.permissions`).
 * Forme : `{ view: { [pluginId]: false } }` — seuls les REFUS sont stockés,
 * l'absence de clé = accès par défaut. Le MJ ignore toujours les grants.
 */
type MemberGrants = {
  view?: Record<string, boolean> | null;
} | null;

export function canViewModule(permissions: unknown, moduleId: string, role: string): boolean {
  if (role === "GM") return true;
  const view = (permissions as MemberGrants)?.view;
  return view?.[moduleId] !== false;
}
