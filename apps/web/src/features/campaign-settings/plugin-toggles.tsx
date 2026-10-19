"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PLUGIN_CATALOG } from "@aetheris/shared";
import { setPluginEnabled } from "./actions";

/**
 * Modules de la campagne : le MJ bascule un plugin par ligne, l'état est
 * toujours déduit d'`enabledPlugins` (rafraîchi par `router.refresh` après
 * l'action) — les joueurs voient l'état en lecture seule.
 */
export function PluginToggles({
  campaignId,
  enabledPlugins,
  isGM,
}: {
  campaignId: string;
  enabledPlugins: string[];
  isGM: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const active = new Set(enabledPlugins);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {PLUGIN_CATALOG.map((p) => {
          const on = active.has(p.id);
          return (
            <li key={p.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm">{p.name}</p>
                <p className="text-xs text-muted">{p.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${on ? "text-accent" : "text-muted"}`}>
                  {on ? "Actif" : "Inactif"}
                </span>
                {isGM && (
                  <button
                    type="button"
                    className="btn px-3 py-1.5 text-xs"
                    aria-pressed={on}
                    aria-label={`${on ? "Désactiver" : "Activer"} ${p.name}`}
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      startTransition(async () => {
                        const res = await setPluginEnabled(campaignId, p.id, !on);
                        if (!res.ok) setError(res.error);
                        else router.refresh();
                      });
                    }}
                  >
                    {pending ? "…" : on ? "Désactiver" : "Activer"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
