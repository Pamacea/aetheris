"use client";

import { useActionState } from "react";
import {
  createCampaign,
  joinCampaignByCode,
  type CampaignFormState,
} from "@/features/campaigns/actions";

/** Création rapide d'une campagne — le MJ est ajouté en membre GM côté serveur. */
export function CreateCampaignForm() {
  const [state, formAction, pending] = useActionState<CampaignFormState, FormData>(
    (_prev, formData) => createCampaign(formData),
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="new-campaign-title">
        Titre de la campagne
      </label>
      <input
        id="new-campaign-title"
        name="title"
        className="input w-56 py-1.5 text-sm"
        placeholder="Titre de la campagne…"
        maxLength={120}
        autoComplete="off"
        required
      />
      <button
        type="submit"
        className="btn btn-primary btn-tri px-4 py-1.5 text-xs"
        disabled={pending}
      >
        {pending ? "…" : "Nouvelle campagne"}
      </button>
      {state && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}

/** Rejoindre une campagne par le code affiché dans le hub du MJ. */
export function JoinCampaignForm() {
  const [state, formAction, pending] = useActionState<CampaignFormState, FormData>(
    (_prev, formData) => joinCampaignByCode(formData),
    null,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <label className="sr-only" htmlFor="join-code">
        Code d&apos;invitation
      </label>
      <input
        id="join-code"
        name="code"
        className="input w-44 py-1.5 text-sm"
        placeholder="Code d'invitation…"
        maxLength={64}
        autoComplete="off"
      />
      <button type="submit" className="btn px-3 py-1.5 text-xs" disabled={pending}>
        {pending ? "…" : "Rejoindre"}
      </button>
      {state && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
