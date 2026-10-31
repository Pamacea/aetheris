"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameModal } from "@/components/game-modal";
import { CopyIcon, ShareIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { setWikiShare } from "./actions";

const TOOLBAR_BUTTON =
  "inline-flex h-8 items-center gap-1.5 border border-border bg-card px-2.5 text-xs text-foreground transition hover:border-accent/60 hover:bg-card-hover";

/**
 * Partage public d'une entrée (MJ) : génère/révoque le `shareSlug`.
 * L'URL absolue est construite au moment de la copie (`window.location`) :
 * le rendu reste compatible SSR et sans mismatch d'hydratation.
 */
export function ShareButton({
  campaignId,
  entityId,
  slug,
}: {
  campaignId: string;
  entityId: string;
  slug: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(slug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ressynchronisation quand le serveur renvoie une autre entrée.
  const [prevSlug, setPrevSlug] = useState(slug);
  if (prevSlug !== slug) {
    setPrevSlug(slug);
    setCurrent(slug);
  }

  async function setShare(shared: boolean) {
    setBusy(true);
    setError(null);
    const res = await setWikiShare(campaignId, entityId, shared);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCurrent(res.slug);
    router.refresh();
  }

  async function copy() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/shared/${current}`);
      toast("Lien public copié");
    } catch {
      toast("Copie impossible — sélectionnez le lien manuellement.");
    }
  }

  return (
    <>
      <button
        type="button"
        className={TOOLBAR_BUTTON}
        title={current ? "Gérer le partage public" : "Partager l’entrée"}
        aria-label={current ? "Gérer le partage public" : "Partager l’entrée"}
        onClick={() => setOpen(true)}
      >
        <ShareIcon />
        <span className="hidden sm:inline">Partager</span>
      </button>

      <GameModal open={open} onClose={() => setOpen(false)} label="Partager l’entrée">
        {current ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Toute personne disposant de ce lien peut consulter l’entrée.
            </p>
            <a
              href={`/shared/${current}`}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm text-accent hover:underline"
            >
              /shared/{current}
            </a>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-primary px-3 py-2 text-xs"
                onClick={() => void copy()}
              >
                <CopyIcon />
                Copier le lien
              </button>
              <button
                type="button"
                className="btn px-3 py-2 text-xs text-destructive"
                disabled={busy}
                onClick={() => void setShare(false)}
              >
                Révoquer
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Cette entrée n’est pas encore partagée publiquement.
            </p>
            <div>
              <button
                type="button"
                className="btn btn-primary px-3 py-2 text-xs"
                disabled={busy}
                onClick={() => void setShare(true)}
              >
                Activer le partage
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
      </GameModal>
    </>
  );
}
