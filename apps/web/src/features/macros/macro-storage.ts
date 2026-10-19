export type Macro = { id: string; name: string; source: string };

export const DEFAULT_SOURCE = `// Retourne la commande envoyée au chat.
// Exemples : "/roll 1d20 + 5", "/roll 2d6 adv", ou un simple message.
return "/roll 1d20";`;

/** Clé localStorage isolée par campagne (aucun modèle DB). */
export function macrosKey(campaignId: string): string {
  return `aetheris:macros:${campaignId}`;
}

// ── Logique pure (testée dans macro-storage.test.ts) ────────────────

/** Valide et filtre la liste sérialisée ; JSON cassé ou entrée invalide → ignorée. */
export function parseMacros(raw: string): Macro[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Macro =>
        !!m &&
        typeof m === "object" &&
        typeof (m as Macro).id === "string" &&
        typeof (m as Macro).name === "string" &&
        typeof (m as Macro).source === "string",
    );
  } catch {
    return [];
  }
}

/** Ajoute ou remplace (même `id`) — renvoie un nouveau tableau. */
export function upsertMacro(macros: Macro[], macro: Macro): Macro[] {
  return macros.some((m) => m.id === macro.id)
    ? macros.map((m) => (m.id === macro.id ? macro : m))
    : [...macros, macro];
}

export function removeMacro(macros: Macro[], id: string): Macro[] {
  return macros.filter((m) => m.id !== id);
}

// ── Abonnement localStorage (getSnapshot = chaîne brute, stable) ────

const macroListeners = new Set<() => void>();

export function emitMacrosChanged(): void {
  for (const listener of macroListeners) listener();
}

export function subscribeMacros(listener: () => void): () => void {
  macroListeners.add(listener);
  return () => {
    macroListeners.delete(listener);
  };
}

export function readMacrosRaw(storageKey: string): string {
  try {
    return window.localStorage.getItem(storageKey) ?? "[]";
  } catch {
    return "[]";
  }
}
