"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { joinCampaignByCode, type JoinCampaignState } from "./actions";

/** Rejoindre une campagne par code d'invitation (le MJ l'affiche dans son hub). */
export function JoinCampaignForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<JoinCampaignState | null, FormData>(
    (_prev, formData) => joinCampaignByCode(formData),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    formRef.current?.reset();
    router.push(`/campaign/${state.id}`);
  }, [state, router]);

  const error = state && !state.ok ? state.error : null;

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <label className="sr-only" htmlFor="join-code">
        Code d&apos;invitation
      </label>
      <input
        id="join-code"
        name="code"
        className="input w-44 py-1 text-sm"
        placeholder="Code d'invitation…"
        maxLength={64}
        autoComplete="off"
      />
      <button type="submit" className="btn px-3 py-1 text-xs" disabled={pending}>
        {pending ? "…" : "Rejoindre"}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
