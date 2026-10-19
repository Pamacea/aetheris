"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exportCampaign, importCampaign } from "../campaign/[id]/actions";

/**
 * Boutons d'export / import du hub campagne (Phase 10).
 * Rangés dans /builder : le hub ne les référence que par un import
 * (page.tsx + actions.ts du hub sont les seuls fichiers partagés autorisés).
 */
export function ArchiveButtons({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const res = await exportCampaign(campaignId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const bytes = Uint8Array.from(atob(res.base64), (ch) => ch.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
    });
  }

  function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    startTransition(async () => {
      const res = await importCampaign(new FormData(form));
      if (!res.ok) {
        setError(res.error);
        form.reset();
        return;
      }
      // Import = création d'une nouvelle campagne → on la rejoint.
      router.push(`/campaign/${res.campaignId}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary px-4 py-2 text-xs"
          disabled={pending}
          onClick={handleExport}
        >
          Exporter (ZIP JSON)
        </button>
        <form onSubmit={handleImport} className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            name="file"
            accept=".zip,application/zip"
            required
            disabled={pending}
            className="text-xs text-muted file:mr-3 file:cursor-pointer file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:text-foreground"
            aria-label="Archive de campagne (.zip)"
          />
          <button type="submit" className="btn px-4 py-2 text-xs" disabled={pending}>
            {pending ? "Traitement…" : "Importer"}
          </button>
        </form>
      </div>
      <p className="text-xs text-muted">
        L&apos;export contient le lore, les modèles et la scène. L&apos;import crée une{" "}
        <strong className="text-foreground">nouvelle campagne</strong> (validée intégralement avant
        écriture).
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
