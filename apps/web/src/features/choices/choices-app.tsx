"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import { ChoiceCard } from "./choice-card";
import { ChoiceForm } from "./choice-form";

/** Données sérialisées d'un choix, servies par la page server. */
export interface ChoiceView {
  id: string;
  prompt: string;
  options: string[];
  status: "open" | "resolved";
  resolvedOption: number | null;
  createdAt: string;
  /** Dépouillement par index d'option. */
  counts: number[];
  /** Vote du joueur connecté (null = pas encore voté). */
  myVote: { optionIndex: number; comment: string | null } | null;
  /** Commentaires (MJ uniquement — rempli par la page côté serveur). */
  comments: { optionIndex: number; comment: string }[];
}

/**
 * Suivi des choix joueurs en direct : un seul abonnement WS par page,
 * qui revalide la vue server à chaque `choices:update` de la room.
 * Les mutations partent des sous-composants (server actions) puis
 * appellent `notifyChanged` pour prévenir les autres clients.
 */
export function ChoicesApp({
  campaignId,
  isGM,
  choices,
}: {
  campaignId: string;
  isGM: boolean;
  choices: ChoiceView[];
}) {
  const router = useRouter();
  const { socket, connected } = useCampaignSocket(campaignId);

  // Notification d'un autre client : on recharge la vue server.
  useEffect(() => {
    const onUpdate = () => router.refresh();
    socket.on("choices:update", onUpdate);
    return () => {
      socket.off("choices:update", onUpdate);
    };
  }, [socket, router]);

  /** Après une mutation réussie : notifie les AUTRES clients de la room
   *  (l'acteur est déjà rechargé par revalidatePath de l'action). */
  function notifyChanged(): void {
    socket.emit("choices:update", { campaignId });
  }

  const open = choices.filter((c) => c.status === "open");
  const resolved = choices.filter((c) => c.status === "resolved");

  return (
    <div className="flex flex-col gap-6">
      <p className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span className={connected ? "" : "text-destructive"}>
          {connected ? "Temps réel actif" : "Hors ligne — reconnexion…"}
        </span>
        <span>
          {open.length} ouvert{open.length > 1 ? "s" : ""} · {resolved.length} résolu
          {resolved.length > 1 ? "s" : ""}
        </span>
      </p>

      {isGM && <ChoiceForm campaignId={campaignId} onMutated={notifyChanged} />}

      <section className="flex flex-col gap-3" aria-labelledby="choices-open">
        <h2 id="choices-open" className="text-sm tracking-widest text-muted uppercase">
          Choix ouverts
        </h2>
        {open.length === 0 ? (
          <p className="panel px-4 py-8 text-center text-sm text-muted">
            Aucun choix en cours — les joueurs sont consultés ici.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {open.map((choice) => (
              <ChoiceCard
                key={choice.id}
                campaignId={campaignId}
                choice={choice}
                isGM={isGM}
                onMutated={notifyChanged}
              />
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="choices-history">
          <h2 id="choices-history" className="text-sm tracking-widest text-muted uppercase">
            Historique
          </h2>
          <div className="flex flex-col gap-3">
            {resolved.map((choice) => (
              <ChoiceCard
                key={choice.id}
                campaignId={campaignId}
                choice={choice}
                isGM={isGM}
                onMutated={notifyChanged}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
