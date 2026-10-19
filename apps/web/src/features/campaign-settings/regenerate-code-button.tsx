"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateInviteCode } from "./actions";

/** Régénère le code d'invitation (MJ) puis rafraîchit la page pour afficher le nouveau. */
export function RegenerateCodeButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className="btn px-3 py-1.5 text-xs"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await regenerateInviteCode(campaignId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Régénération…" : "Régénérer"}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </>
  );
}
