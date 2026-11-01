"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCampaignAsPreset, setSystemPublic } from "@/features/game-systems/actions";

/**
 * Presets de systèmes (MJ) : capture la campagne courante (modèles, notes wiki,
 * handouts) en système personnel réutilisable, et bascule leur visibilité.
 */
export function SystemPresetPanel({
  campaignId,
  systems,
}: {
  campaignId: string;
  systems: { id: string; name: string; isPublic: boolean }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveCampaignAsPreset(campaignId, {
        name: String(formData.get("name") ?? ""),
        isPublic: formData.get("isPublic") === "on",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setIsPublic(false);
      setSaved(true);
      router.refresh();
    });
  }

  function toggle(systemId: string, next: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setSystemPublic(systemId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="panel flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-xs tracking-widest text-muted uppercase">Presets de systèmes</h2>
        <p className="mt-1 text-[0.7rem] text-muted">
          Enregistre les modèles, notes wiki et handouts de cette campagne comme système
          réutilisable. Un preset public est sélectionnable par les autres MJ.
        </p>
      </div>

      <form action={save} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs text-muted">
          Nom du preset
          <input
            className="input"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            autoComplete="off"
            required
            disabled={pending}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            name="isPublic"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
            disabled={pending}
          />
          Rendre public
        </label>
        <button type="submit" className="btn px-3 py-1.5 text-xs" disabled={pending}>
          {pending ? "Création…" : "Créer le preset"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {saved && <p className="text-xs text-accent">Preset enregistré.</p>}

      {systems.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {systems.map((system) => (
            <li key={system.id} className="flex items-center justify-between gap-3 py-2 text-xs">
              <span className="truncate">{system.name}</span>
              <button
                type="button"
                className="btn px-3 py-1 text-xs"
                disabled={pending}
                onClick={() => toggle(system.id, !system.isPublic)}
              >
                {system.isPublic ? "Rendre privé" : "Rendre public"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
