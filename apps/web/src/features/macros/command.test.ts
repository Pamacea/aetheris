import { describe, expect, it } from "vitest";
import { MAX_CONTENT, MAX_EXPRESSION, parseCommand } from "./command";

describe("parseCommand", () => {
  it("reconnaît les jets /roll, /dé et /dés (insensible à la casse)", () => {
    expect(parseCommand("/roll 1d20 + 5")).toEqual({
      kind: "roll",
      expression: "1d20 + 5",
    });
    expect(parseCommand("  /DÉ 2d6 adv  ")).toEqual({ kind: "roll", expression: "2d6 adv" });
    expect(parseCommand("/dés 4d6kh3")).toEqual({ kind: "roll", expression: "4d6kh3" });
  });

  it("borne l'expression à la limite du schema WS", () => {
    const long = "1".repeat(MAX_EXPRESSION + 50);
    const parsed = parseCommand(`/roll ${long}`);
    expect(parsed.kind).toBe("roll");
    if (parsed.kind === "roll") expect(parsed.expression).toHaveLength(MAX_EXPRESSION);
  });

  it("évalue /calc localement (comme chat-panel)", () => {
    expect(parseCommand("/calc 2+3*4")).toEqual({
      kind: "calc",
      expression: "2+3*4",
      value: 14,
    });
    expect(parseCommand("/calcul (1+1)")).toEqual({ kind: "calc", expression: "(1+1)", value: 2 });
    expect(parseCommand("/calc 2+")).toEqual({ kind: "error", message: "Formule invalide : 2+" });
  });

  it("texte libre → message de chat, borné à 4000 caractères", () => {
    expect(parseCommand("  Bonjour la table  ")).toEqual({
      kind: "message",
      content: "Bonjour la table",
    });
    const long = parseCommand("x".repeat(MAX_CONTENT + 100));
    expect(long.kind).toBe("message");
    if (long.kind === "message") expect(long.content).toHaveLength(MAX_CONTENT);
  });

  it("rejette les commandes inconnues et les sorties vides", () => {
    expect(parseCommand("/imprimer fiche")).toEqual({
      kind: "error",
      message: "Commande inconnue : /imprimer fiche",
    });
    expect(parseCommand("/roll")).toEqual({
      kind: "error",
      message: "Commande inconnue : /roll",
    });
    expect(parseCommand("   ")).toEqual({
      kind: "error",
      message: "La macro n'a retourné aucune commande.",
    });
  });
});
