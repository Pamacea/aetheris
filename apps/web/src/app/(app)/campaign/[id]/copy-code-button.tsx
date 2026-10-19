"use client";

import { useState } from "react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="btn px-3 py-1.5 text-xs"
      onClick={async () => {
        // `navigator` n'existe pas pendant le SSR du composant client.
        if (typeof navigator === "undefined" || !navigator.clipboard) return;
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copié !" : "Copier le code"}
    </button>
  );
}
