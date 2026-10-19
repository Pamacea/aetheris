import { evaluateFormula } from "@/lib/formula";

/** Bornes des schemas WS (`diceRollRequestSchema` / `chatSendSchema`). */
export const MAX_EXPRESSION = 100;
export const MAX_CONTENT = 4_000;

export type ChatCommand =
  | { kind: "roll"; expression: string }
  | { kind: "calc"; expression: string; value: number }
  | { kind: "message"; content: string }
  | { kind: "error"; message: string };

/**
 * Normalise la commande retournée par une macro, avec la MÊME grammaire
 * que `chat-panel.tsx` : `/roll|dé|dés <expr>` (jet serveur),
 * `/calc|calcul <expr>` (local), texte libre → message de chat,
 * tout autre `/…` → erreur.
 */
export function parseCommand(raw: string): ChatCommand {
  const text = raw.trim();
  if (!text) return { kind: "error", message: "La macro n'a retourné aucune commande." };

  const roll = text.match(/^\/(?:roll|dé|dés)\s+(.+)/i);
  if (roll) {
    const expression = roll[1].trim().slice(0, MAX_EXPRESSION);
    if (expression) return { kind: "roll", expression };
  }

  const calc = text.match(/^\/(?:calc|calcul)\s+(.+)/i);
  if (calc) {
    const expression = calc[1].trim().slice(0, MAX_EXPRESSION);
    const value = expression ? evaluateFormula(expression, {}) : null;
    return value === null
      ? { kind: "error", message: `Formule invalide : ${expression || text}` }
      : { kind: "calc", expression, value };
  }

  if (text.startsWith("/")) return { kind: "error", message: `Commande inconnue : ${text}` };
  return { kind: "message", content: text.slice(0, MAX_CONTENT) };
}
