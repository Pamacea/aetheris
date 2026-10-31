"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEntityAssignees } from "./actions";

interface AssigneePickerProps {
  campaignId: string;
  entityId: string;
  members: { userId: string; name: string }[];
  assigneeIds: string[];
}

/** Cases à cocher des joueurs assignés (panneau Détails, MJ uniquement). */
export function AssigneePicker({
  campaignId,
  entityId,
  members,
  assigneeIds,
}: AssigneePickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(assigneeIds);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: string[]) {
    const previous = selected;
    setSelected(next);
    setError(null);
    startTransition(async () => {
      const res = await setEntityAssignees(campaignId, entityId, next);
      if (!res.ok) {
        setError(res.error);
        setSelected(previous); // le serveur fait foi
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <span className="text-[0.65rem] tracking-widest text-muted uppercase">
          Joueurs assignés
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            className="text-xs text-muted hover:text-foreground disabled:opacity-50"
            disabled={pending}
            onClick={() => save([])}
          >
            Aucun assigné
          </button>
        )}
      </div>
      {members.length === 0 ? (
        <p className="text-xs text-muted">Aucun membre dans cette campagne.</p>
      ) : (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {members.map((m) => (
            <li key={m.userId}>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={selected.includes(m.userId)}
                  disabled={pending}
                  onChange={() =>
                    save(
                      selected.includes(m.userId)
                        ? selected.filter((id) => id !== m.userId)
                        : [...selected, m.userId],
                    )
                  }
                />
                {m.name}
              </label>
            </li>
          ))}
        </ul>
      )}
      {selected.length === 0 && (
        <p className="text-xs text-muted">
          Aucun assigné — la fiche est en lecture seule pour les joueurs.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
