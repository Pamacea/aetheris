"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PLUGIN_CATALOG, type PluginId } from "@aetheris/shared";
import { setCampaignPlugin } from "./actions";

/**
 * Activation des modules étendus par campagne (Phase 8).
 * Le MJ bascule un plugin ; les joueurs voient l'état en lecture seule.
 */
export function PluginToggles({
  campaignId,
  enabledPlugins,
  isGM,
  hiddenPlugins = [],
}: {
  campaignId: string;
  enabledPlugins: string[];
  isGM: boolean;
  /** Modules refusés à CE membre par un grant MJ (lecture seule côté joueur). */
  hiddenPlugins?: string[];
}) {
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(enabledPlugins));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Re-sync si le serveur renvoie une autre liste (autre MJ, refresh).
  const serverKey = [...enabledPlugins].sort().join("|");
  const localKey = [...enabled].sort().join("|");
  if (serverKey !== localKey && !pending) {
    setEnabled(new Set(enabledPlugins));
  }

  function toggle(id: PluginId, next: boolean) {
    setError(null);
    // Optimiste : l'état local bouge tout de suite.
    setEnabled((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
    startTransition(async () => {
      const res = await setCampaignPlugin(campaignId, id, next);
      if (!res.ok) {
        setError(res.error);
        setEnabled(new Set(enabledPlugins));
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-3 sm:grid-cols-2">
        {PLUGIN_CATALOG.map((p) => {
          const on = enabled.has(p.id);
          if (!isGM && hiddenPlugins.includes(p.id)) return null;
          return (
            <li key={p.id} className="panel flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
              </div>
              <p className="text-xs text-muted">{p.description}</p>
              <div className="mt-auto flex items-center justify-between gap-2">
                {isGM ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggle(p.id, !on)}
                    aria-pressed={on}
                    className={`border px-3 py-1.5 text-xs tracking-widest uppercase transition-colors disabled:opacity-50 ${
                      on
                        ? "border-accent bg-accent/10 text-accent hover:bg-accent/20"
                        : "border-border text-muted hover:border-accent/60 hover:text-foreground"
                    }`}
                  >
                    {on ? "Activé ✓ — désactiver" : "Activer"}
                  </button>
                ) : (
                  <span className={`text-xs ${on ? "text-accent" : "text-muted"}`}>
                    {on ? "Actif" : "Inactif"}
                  </span>
                )}
                {on && p.path && (
                  <Link
                    href={`/campaign/${campaignId}/${p.path}`}
                    className="text-xs text-accent hover:underline"
                  >
                    Ouvrir →
                  </Link>
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
