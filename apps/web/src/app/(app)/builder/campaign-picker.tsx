"use client";

import { useRouter } from "next/navigation";

/**
 * Sélecteur de campagne du builder : bascule `?c=<id>` — les zones
 * plugins et macros se décalent sur la campagne choisie.
 */
export function CampaignPicker({
  campaigns,
  selectedId,
}: {
  campaigns: { id: string; title: string }[];
  selectedId?: string;
}) {
  const router = useRouter();

  return (
    <label className="flex w-full max-w-sm flex-col gap-1.5">
      <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
        Campagne de travail
      </span>
      <select
        id="builder-campaign"
        name="campaign"
        className="input"
        value={selectedId ?? ""}
        aria-label="Campagne de travail"
        onChange={(e) => {
          const id = e.target.value;
          router.replace(id ? `/builder?c=${id}` : "/builder");
        }}
      >
        <option value="">— Choisir une campagne —</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
    </label>
  );
}
