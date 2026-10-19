"use client";

import { useState, useTransition } from "react";
import { CycleStatus } from "@/components/cycle-status";
import { setMemberRole } from "./actions";

const ROLES = [
  { value: "GM", label: "MJ" },
  { value: "PLAYER", label: "PJ" },
];

/**
 * Rôle MJ / Joueur d'un membre — bouton cyclique (jamais de select), écrit
 * via server action ; le parent impose `key={role}` pour resynchroniser
 * l'état quand le serveur confirme.
 */
export function MemberRoleSelect({
  campaignId,
  memberId,
  role,
  name,
}: {
  campaignId: string;
  memberId: string;
  role: string;
  name: string;
}) {
  const [value, setValue] = useState(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    if (pending || next === value) return;
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
    <div className="flex items-center gap-2 self-stretch">
      <CycleStatus
        states={ROLES}
        current={value}
        onCycle={change}
        legend={`Rôle de ${name}`}
        className="self-stretch"
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
