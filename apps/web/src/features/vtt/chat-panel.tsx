"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, DiceRoll } from "@aetheris/shared";
import { evaluateFormula } from "@/lib/formula";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import { useDiceRoll } from "@/lib/use-dice-roll";
import { ChatLog, type ChatEntry } from "./chat-log";

interface ChatPanelProps {
  campaignId: string;
  /** Historique persisté (derniers messages, côté serveur). */
  initialMessages: ChatMessage[];
}

/**
 * Panneau Chat & Dés : messages temps réel par campagne, historique
 * persistant, commandes `/roll <expression>` (jet validé par
 * `useDiceRoll`, le serveur tire et broadcast) et `/calc <expr>`
 * (arithmétique via `@/lib/formula`).
 */
export function ChatPanel({ campaignId, initialMessages }: ChatPanelProps) {
  const { socket, connected } = useCampaignSocket(campaignId);
  const dice = useDiceRoll(campaignId);
  const [entries, setEntries] = useState<ChatEntry[]>(() =>
    initialMessages.map((m) => ({
      key: m.id,
      kind: "msg",
      authorName: m.authorName,
      content: m.content,
      sentAt: m.sentAt,
    })),
  );
  const [draft, setDraft] = useState("");
  const [calcError, setCalcError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMessage = (m: ChatMessage) => {
      setEntries((prev) => [
        ...prev,
        {
          key: m.id,
          kind: "msg",
          authorName: m.authorName,
          content: m.content,
          sentAt: m.sentAt,
        },
      ]);
    };
    const onRoll = (r: DiceRoll) => {
      setEntries((prev) => [
        ...prev,
        {
          key: `${r.seed}-${r.expression}-${prev.length}`,
          kind: "roll",
          authorName: r.rollerName,
          expression: r.expression,
          detail: `${r.results.join(" + ")} = ${r.total}`,
          sentAt: new Date().toISOString(),
        },
      ]);
    };
    const onException = (err: { message?: string }) => {
      console.error("[ws]", err.message ?? err);
    };

    socket.on("chat:message", onMessage);
    socket.on("dice:rolled", onRoll);
    socket.on("exception", onException);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("dice:rolled", onRoll);
      socket.off("exception", onException);
    };
  }, [socket]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setCalcError(null);

    const rollMatch = text.match(/^\/(?:roll|dé|dés)\s+(.+)/i);
    if (rollMatch?.[1]) {
      const expression = rollMatch[1];
      // @macro : résolution côté serveur (Entity de la campagne) — sinon
      // le hook valide l'expression côté client et affiche l'erreur.
      if (expression.includes("@")) socket.emit("dice:roll", { campaignId, expression });
      else dice.roll(expression, {}, "chat");
      return;
    }

    const calcMatch = text.match(/^\/(?:calc|calcul)\s+(.+)/i);
    if (calcMatch?.[1]) {
      const expression = calcMatch[1];
      const value = evaluateFormula(expression, {});
      setEntries((prev) =>
        value === null
          ? prev
          : [
              ...prev,
              {
                key: `${Date.now()}-calc`,
                kind: "calc",
                expression,
                detail: String(value),
                sentAt: new Date().toISOString(),
              },
            ],
      );
      if (value === null) setCalcError("Formule invalide.");
      return;
    }

    if (text.startsWith("/")) {
      setCalcError("Commande inconnue — /roll 1d20+5 ou /calc 2+3.");
      return;
    }
    socket.emit("chat:send", { campaignId, content: text });
  };

  const notice = calcError ?? dice.error?.message ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[0.65rem] text-muted">{connected ? "Connecté" : "Connexion…"}</span>
        <span className="text-[0.65rem] text-muted">/roll 2d6+3</span>
      </div>

      <ChatLog entries={entries} logRef={logRef} />

      <form
        onSubmit={send}
        className="flex gap-2 border-t border-border p-2"
        aria-label="Envoyer un message"
      >
        <input
          className="input min-w-0 flex-1 py-1 text-xs"
          name="message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message ou /roll 1d20+5"
          aria-label="Message"
          maxLength={4000}
        />
        <button type="submit" className="btn px-3 py-1 text-xs">
          Envoyer
        </button>
      </form>
      {notice && (
        <p
          role="alert"
          className="border-t border-border px-3 py-1 text-[0.65rem] text-destructive"
        >
          {notice}
        </p>
      )}
    </div>
  );
}
