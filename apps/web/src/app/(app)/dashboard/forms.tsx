"use client";

import { useActionState, useState } from "react";
import { GameModal } from "@/components/game-modal";
import {
  createCampaign,
  joinCampaignByCode,
  type CampaignFormState,
} from "@/features/campaigns/actions";

/** Création rapide d'une campagne — le MJ est ajouté en membre GM côté serveur. */
export function CreateCampaignForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CampaignFormState, FormData>(
    (_prev, formData) => createCampaign(formData),
    null,
  );

  function close() {
    if (!pending) setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        className="btn btn-primary btn-tri px-4 py-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        + Nouvelle campagne
      </button>

      {open && (
        <GameModal open={open} onClose={close} label="Nouvelle campagne">
          <form action={formAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5" htmlFor="new-campaign-title">
              <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
                Titre de la campagne
              </span>
              <input
                id="new-campaign-title"
                name="title"
                className="input"
                placeholder="Titre de la campagne…"
                maxLength={120}
                autoComplete="off"
                autoFocus
                required
              />
            </label>

            {state && <p className="text-xs text-destructive">{state.error}</p>}

            <footer className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="btn px-3 py-1.5 text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-tri px-4 py-1.5 text-xs"
                disabled={pending}
              >
                {pending ? "Création…" : "Créer"}
              </button>
            </footer>
          </form>
        </GameModal>
      )}
    </>
  );
}

/** Rejoindre une campagne par le code affiché dans le hub du MJ. */
export function JoinCampaignForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CampaignFormState, FormData>(
    (_prev, formData) => joinCampaignByCode(formData),
    null,
  );

  function close() {
    if (!pending) setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        className="btn px-3 py-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        Rejoindre
      </button>

      {open && (
        <GameModal open={open} onClose={close} label="Rejoindre une campagne">
          <form action={formAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5" htmlFor="join-code">
              <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
                Code d&apos;invitation
              </span>
              <input
                id="join-code"
                name="code"
                className="input"
                placeholder="Code d'invitation…"
                maxLength={64}
                autoComplete="off"
                autoFocus
              />
            </label>

            {state && <p className="text-xs text-destructive">{state.error}</p>}

            <footer className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="btn px-3 py-1.5 text-xs"
              >
                Annuler
              </button>
              <button type="submit" className="btn px-3 py-1.5 text-xs" disabled={pending}>
                {pending ? "…" : "Rejoindre"}
              </button>
            </footer>
          </form>
        </GameModal>
      )}
    </>
  );
}
