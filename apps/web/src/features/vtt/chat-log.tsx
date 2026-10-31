import type { RefObject } from "react";

export type ChatEntry =
  | {
      key: string;
      kind: "msg";
      authorName: string;
      content: string;
      sentAt: string;
    }
  | {
      key: string;
      kind: "roll";
      authorName: string;
      expression: string;
      detail: string;
      sentAt: string;
    }
  | {
      key: string;
      kind: "calc";
      expression: string;
      detail: string;
      sentAt: string;
    };

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Journal défilable des messages + jets de dés (auto-scroll en bas). */
export function ChatLog({
  entries,
  logRef,
}: {
  entries: ChatEntry[];
  logRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={logRef}
      className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
      aria-label="Messages"
    >
      {entries.length === 0 && (
        <p className="text-xs text-muted">
          Aucun message — dites bonjour, ou tapez <code>/roll 1d20</code>.
        </p>
      )}
      {entries.map((entry) =>
        entry.kind === "msg" ? (
          <div key={entry.key} className="text-xs leading-relaxed">
            <span className="text-[0.65rem] text-muted">{fmtTime(entry.sentAt)} </span>
            <span className="font-semibold text-accent">{entry.authorName}</span>
            <span className="text-foreground"> : {entry.content}</span>
          </div>
        ) : entry.kind === "roll" ? (
          <div key={entry.key} className="border border-accent/40 bg-accent/10 px-2 py-1 text-xs">
            <span className="font-semibold text-accent">{entry.authorName}</span>{" "}
            <span className="text-muted">jette</span>{" "}
            <span className="font-mono">{entry.expression}</span>
            <span className="mt-0.5 block font-mono text-accent">→ {entry.detail}</span>
          </div>
        ) : (
          <div key={entry.key} className="border border-border bg-card/60 px-2 py-1 text-xs">
            <span className="text-muted">calcul</span>{" "}
            <span className="font-mono">{entry.expression}</span>
            <span className="mt-0.5 block font-mono text-foreground">= {entry.detail}</span>
          </div>
        ),
      )}
    </div>
  );
}
