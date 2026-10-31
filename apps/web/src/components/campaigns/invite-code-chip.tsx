"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";

/** Icônes inline (pas de librairie d'icônes dans le projet). */
function CopyIcon({ copied }: { copied: boolean }) {
  return copied ? (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M3 8.5 6.2 12 13 4.5" />
    </svg>
  ) : (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <rect x="5.5" y="5.5" width="8" height="8" />
      <path d="M10.5 5.5v-3h-8v8h3" />
    </svg>
  );
}

/**
 * Puce d'invitation : code + action de copie dans un seul contrôle.
 * `CopyCodeButton` (settings) ré-exporte ce composant avec la même API `{ code }`.
 */
export function InviteCodeChip({ code }: { code: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    // `navigator` n'existe pas pendant le SSR du composant client.
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      toast("Copie impossible — sélectionnez le code manuellement");
      return;
    }
    setCopied(true);
    toast("Code d'invite copié");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Code d'invitation copié" : `Copier le code d'invitation ${code}`}
      className="btn gap-2 px-2.5 py-1 text-xs normal-case tracking-normal"
    >
      <code className="text-accent">{code}</code>
      <span className="flex items-center gap-1 text-[0.65rem] tracking-widest text-muted uppercase">
        <CopyIcon copied={copied} />
        {copied ? "Copié" : "Copier"}
      </span>
    </button>
  );
}
