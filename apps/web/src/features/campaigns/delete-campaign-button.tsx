"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteCampaign } from "./actions";

/**
 * Suppression définitive d'une campagne : bouton + modale de confirmation.
 * Le rôle MJ est revérifié dans l'action serveur, pas seulement ici.
 */
export function DeleteCampaignButton({ campaignId, title }: { campaignId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCampaign(campaignId);
      if (!result.ok) {
        setOpen(false);
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn px-3 py-1.5 text-xs"
        aria-label={`Supprimer la campagne ${title}`}
        onClick={() => setOpen(true)}
      >
        Supprimer
      </button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
      <ConfirmDialog
        open={open}
        title={`Supprimer « ${title} » ?`}
        description={`« ${title} » et tout son contenu (wiki, fiches, journal, scène, membres) seront définitivement supprimés.`}
        confirmLabel="Supprimer"
        danger
        pending={pending}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
