"use client";

import { useActionState } from "react";
import { GAME_SYSTEMS } from "@aetheris/shared";
import { saveCampaignSettings, type SettingsFormState } from "./actions";

/**
 * Informations campagne (titre, couverture, logo, système de jeu).
 * Écriture MJ-only : le contrôle est désactivé pour les joueurs ici, mais
 * le rôle est revérifié dans l'action (jamais fait confiance au client).
 */
export function SettingsInfoForm({
  campaignId,
  isGM,
  initial,
}: {
  campaignId: string;
  isGM: boolean;
  initial: { title: string; coverImage: string | null; logo: string | null; gameSystem: string };
}) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    (_prev, formData) => saveCampaignSettings(campaignId, formData),
    null,
  );

  const systems = GAME_SYSTEMS.some((s) => s.id === initial.gameSystem)
    ? GAME_SYSTEMS
    : // valeur hors presets (système créé par le MJ) : conservée dans la liste
      [...GAME_SYSTEMS, { id: initial.gameSystem, name: initial.gameSystem, description: "" }];

  return (
    <form action={formAction} className="panel flex flex-col gap-4 p-4">
      <h2 className="text-xs tracking-widest text-muted uppercase">
        <span className="mark-tri" aria-hidden />
        Informations de la campagne
      </h2>

      <label className="flex flex-col gap-1 text-xs text-muted">
        Titre
        <input
          className="input"
          name="title"
          defaultValue={initial.title}
          maxLength={120}
          autoComplete="off"
          required
          disabled={!isGM || pending}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Image de couverture (URL ou data:image/…)
          <input
            className="input"
            name="coverImage"
            defaultValue={initial.coverImage ?? ""}
            placeholder="Laisser vide pour retirer"
            autoComplete="off"
            disabled={!isGM || pending}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Logo (URL ou data:image/…)
          <input
            className="input"
            name="logo"
            defaultValue={initial.logo ?? ""}
            placeholder="Laisser vide pour retirer"
            autoComplete="off"
            disabled={!isGM || pending}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs text-muted">
        Système de jeu
        <select
          className="input"
          name="gameSystem"
          defaultValue={initial.gameSystem}
          disabled={!isGM || pending}
        >
          {systems.map((system) => (
            <option key={system.id} value={system.id}>
              {system.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        {isGM && (
          <button
            type="submit"
            className="btn btn-primary btn-tri px-4 py-1.5 text-xs"
            disabled={pending}
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        )}
        {state?.ok && <p className="text-xs text-accent">Réglages enregistrés ✓</p>}
        {state && !state.ok && <p className="text-xs text-destructive">{state.error}</p>}
        {!isGM && <p className="text-xs text-muted">Lecture seule — réservé aux MJ.</p>}
      </div>
    </form>
  );
}
