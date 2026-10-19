"use client";

import { useState, useTransition } from "react";
import { setMemberViewGrant } from "./actions";

/**
 * Case « voit » d'un module pour un joueur — refus persisté via server
 * action ; rollback local si le serveur refuse (le serveur fait foi) et
 * remontage via `key={view}` côté parent quand il confirme.
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
  const [view, setView] = useState(initialView);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    setError(null);
    setView(next);
    startTransition(async () => {
      const res = await setMemberViewGrant(campaignId, memberId, moduleId, next);
      if (!res.ok) {
        setError(res.error);
        setView(initialView);
      }
    });
  }

  return (
    <span className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-muted">
        <input
          type="checkbox"
          checked={view}
          disabled={pending}
          aria-label={`${label} : consultation`}
          className="accent-accent"
          onChange={(e) => change(e.target.checked)}
        />
        voit
      </label>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
