"use client";

import { useState, useTransition } from "react";
import { setMemberRole } from "./actions";

/**
 * Sélecteur MJ / Joueur d'un membre — écrit via server action ; le parent
 * impose `key={role}` pour resynchroniser l'état quand le serveur confirme.
 */
export function MemberRoleSelect({
  campaignId,
  memberId,
  role,
}: {
  campaignId: string;
  memberId: string;
  role: string;
}) {
  const [value, setValue] = useState(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    if (next === value) return;
    setError(null);
    setValue(next);
    startTransition(async () => {
      const res = await setMemberRole(campaignId, memberId, next);
      if (!res.ok) {
        setError(res.error);
        setValue(role); // annulation visuelle — le serveur fait foi
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="input py-1 text-xs"
        value={value}
        disabled={pending}
        aria-label="Rôle du membre"
        onChange={(e) => change(e.target.value)}
      >
        <option value="GM">MJ</option>
        <option value="PLAYER">Joueur</option>
      </select>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
