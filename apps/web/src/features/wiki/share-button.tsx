"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setWikiShare } from "./actions";

/**
 * Partage public d'une entrée (MJ) : génère/révoque le `shareSlug`.
 * L'URL publique est construite au moment du clic (`window.location`) :
 * le composant reste compatible SSR.
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
  const [current, setCurrent] = useState(slug);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
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
    await navigator.clipboard.writeText(`${window.location.origin}/shared/${current}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!current) {
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          disabled={busy}
          onClick={() => void setShare(true)}
        >
          Partager
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    );
  }

  return (
    // Lien à gauche, groupe d'actions à droite : min-w pour que
    // justify-between ait un axe (sinon le conteneur est dimensionné
    // au contenu et les deux restent collés).
    <span className="flex min-w-72 flex-wrap items-center justify-between gap-2 text-xs">
      <a
        className="min-w-0 truncate text-accent hover:underline"
        href={`/shared/${current}`}
        target="_blank"
        rel="noreferrer"
      >
        Lien public
      </a>
      <span className="flex items-center gap-2">
        <button type="button" className="btn px-2 py-1 text-xs" onClick={() => void copy()}>
          {copied ? "Copié ✓" : "Copier"}
        </button>
        <button
          type="button"
          className="btn px-2 py-1 text-xs text-destructive"
          disabled={busy}
          onClick={() => void setShare(false)}
        >
          Révoquer
        </button>
      </span>
      {error && <span className="basis-full text-xs text-destructive">{error}</span>}
    </span>
  );
}
