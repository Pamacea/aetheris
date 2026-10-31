/** Fusionne un patch combat (token → fiche) dans les valeurs du template.
 *  `null` est appliqué (PV remis à zéro) ; seule `undefined` est ignorée.
 *  Retourne `values` tel quel si rien ne change (pas de re-render inutile). */
export function mergeCombatPatch(
  values: Record<string, unknown>,
  keys: { hp: string | null; hpMax: string | null; ac: string | null },
  patch: { hp?: number | null; hpMax?: number | null; ac?: number | null },
): Record<string, unknown> {
  let next = values;
  for (const k of ["hp", "hpMax", "ac"] as const) {
    const key = keys[k];
    const v = patch[k];
    if (key === null || v === undefined || next[key] === v) continue;
    if (next === values) next = { ...values };
    next[key] = v;
  }
  return next;
}
