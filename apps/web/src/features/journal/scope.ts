/**
 * Portée de lecture du journal : le MJ voit tout, le joueur ne voit
 * que les entrées partagées. Appliqué côté serveur dans le `where`
 * (jamais seulement dans l'UI).
 */
export function journalScope(campaignId: string, isGM: boolean) {
  return { campaignId, ...(isGM ? {} : { shared: true }) };
}
