"use client";

import { useEffect, useRef, useState } from "react";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import type { ChatMessage, DiceRoll } from "@aetheris/shared";
import { ChatLog, type ChatEntry } from "./chat-log";

interface ChatPanelProps {
  campaignId: string;
  /** Historique persisté (derniers messages, côté serveur). */
  initialMessages: ChatMessage[];
}

/**
 * Panneau Chat & Dés (Phase 6) : messages temps réel par campagne,
 * historique persistant, commandes `/roll <expression>` (le serveur
 * tire les dés et broadcast le résultat identique à tous).
 */
export function ChatPanel({ campaignId, initialMessages }: ChatPanelProps) {
  const { socket, connected } = useCampaignSocket(campaignId);
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

    const rollMatch = text.match(/^\/(?:roll|roll?|dé|dés)\s+(.+)/i);
    if (rollMatch?.[1]) {
      socket.emit("dice:roll", { campaignId, expression: rollMatch[1] });
      return;
    }
    if (text.startsWith("/")) return; // commande inconnue : ignorée
    socket.emit("chat:send", { campaignId, content: text });
  };

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
    </div>
  );
}
