"use client";

import { useTransition } from "react";
import { setMemberViewGrant } from "./actions";

/**
 * Case « voit » d'un module étendu — grant persisté via server action.
 * Le refus (décoché) est écrit sur `CampaignMember.permissions.view` ;
 * le MJ est toujours forcé à vrai côté serveur.
 */
export function ModuleViewToggle({
  campaignId,
  memberId,
  moduleId,
  label,
  initialView,
}: {
  campaignId: string;
  memberId: string;
  moduleId: string;
  label: string;
  initialView: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    startTransition(async () => {
      const res = await setMemberViewGrant(campaignId, memberId, moduleId, next);
      if (!res.ok) alert(res.error); // rollback : le parent resynchronise via RSC
    });
  }

  return (
    <label className="flex items-center gap-1.5 text-muted">
      <input
        type="checkbox"
        name={`module-${moduleId}-consultation`}
        checked={initialView}
        disabled={pending}
        aria-label={`${label} : consultation`}
        className="accent-accent"
        onChange={(e) => change(e.target.checked)}
      />
      voit
    </label>
  );
}
