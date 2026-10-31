"use client";

import { useActionState, useState } from "react";
import { GameModal } from "@/components/game-modal";
import { joinCampaignByCode, type CampaignFormState } from "@/features/campaigns/actions";
import { CampaignWizard } from "@/features/game-systems/campaign-wizard";
import type { GameSystemOption } from "@/features/game-systems/systems";

/** Création d'une campagne via l'assistant (identité → système de jeu). */
export function CreateCampaignForm({ systems }: { systems: GameSystemOption[] }) {
  return <CampaignWizard initialSystems={systems} />;
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
