import { randomSeed, roll } from "@aetheris/shared";
import { evaluateFormula } from "@/lib/formula";

export type JetResult = { ok: true; total: number; detail: string } | { ok: false; error: string };

/**
 * Jet d'un bloc « Jet de dés » : notation de dés (`2d6+3`, `1d20 adv`)
 * via le moteur partagé ; expression purement arithmétique (`max(4,9)+1`,
 * `(3+2)*4`) via `@/lib/formula` — aucune évaluation `eval`.
 */
export function resolveJet(expr: string): JetResult {
  try {
    const out = roll(expr, randomSeed());
    return {
      ok: true,
      total: out.total,
      detail: out.results.length > 0 ? out.results.join(" + ") : out.label,
    };
  } catch (e) {
    const fallback = evaluateFormula(expr, {});
    if (fallback !== null) return { ok: true, total: fallback, detail: "formule" };
    return { ok: false, error: e instanceof Error ? e.message : "Expression invalide." };
  }
}
