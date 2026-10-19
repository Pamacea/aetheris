"use client";

import type { GameSystemRecord } from "@aetheris/shared";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GameModal } from "@/components/game-modal";
import { createCampaign } from "./actions";
import { CreateCampaignForm } from "./create-campaign-form";
import { useCreateCampaignDraft } from "./create-campaign-state";

export function CreateCampaignButton({ customSystems }: { customSystems: GameSystemRecord[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const {
    error,
    setError,
    draft,
    patch,
    handleFile,
    reset,
    coverInputRef,
    logoInputRef,
    themeInputRef,
  } = useCreateCampaignDraft();
  const { theme, gameSystem, themeScript, themeScriptName, cover, logo } = draft;

  function close() {
    if (pending) return;
    setOpen(false);
    reset();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (themeScript) formData.set("customThemeScript", themeScript);
    if (cover) formData.set("coverImage", cover);
    if (logo) formData.set("logo", logo);

    setError(null);
    startTransition(async () => {
      const result = await createCampaign(formData);
      if (result.ok) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary btn-broken" onClick={() => setOpen(true)}>
        + Créer une campagne
      </button>

      {/* Monté conditionnellement : le formulaire doit être démonté à la
          fermeture pour repartir d'inputs vides. frame={false} : il porte
          déjà son panneau et son entête. Échap/clic → close(), qui refuse
          la fermeture pendant `pending`. */}
      {open && (
        <GameModal open={open} onClose={close} label="Créer une campagne" frame={false}>
          <CreateCampaignForm
            customSystems={customSystems}
            pending={pending}
            error={error}
            theme={theme}
            themeScript={themeScript}
            themeScriptName={themeScriptName}
            gameSystem={gameSystem}
            cover={cover}
            logo={logo}
            coverInputRef={coverInputRef}
            logoInputRef={logoInputRef}
            themeInputRef={themeInputRef}
            onPickTheme={(id) => patch({ theme: id, themeScript: null, themeScriptName: null })}
            onPickSystem={(id) => patch({ gameSystem: id })}
            onFile={handleFile}
            onRemoveThemeScript={() => {
              patch({ theme: "pandemonium", themeScript: null, themeScriptName: null });
              if (themeInputRef.current) themeInputRef.current.value = "";
            }}
            onClearCover={() => {
              patch({ cover: null });
              if (coverInputRef.current) coverInputRef.current.value = "";
            }}
            onClearLogo={() => {
              patch({ logo: null });
              if (logoInputRef.current) logoInputRef.current.value = "";
            }}
            onClose={close}
            onSubmit={handleSubmit}
          />
        </GameModal>
      )}
    </>
  );
}
