"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import { ChoiceCard } from "./choice-card";
import { ChoiceForm } from "./choice-form";
import type { ChoiceView } from "./choice-view";

/**
 * Suivi des choix joueurs en direct : un seul abonnement WS par page,
 * qui revalide la vue server à chaque `choices:update` de la room.
 * L'acteur met à jour sa liste avec la réponse de l'action (pas de
 * re-render serveur) ; les autres clients rechargent via la room.
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

  // Liste locale = source d'affichage ; resynchronisée quand un refresh
  // serveur (événement room) fournit de nouvelles props.
  const [items, setItems] = useState(choices);
  const [synced, setSynced] = useState(choices);
  if (choices !== synced) {
    setSynced(choices);
    setItems(choices);
  }

  // En fenêtre VTT (iframe), le module défile avec le document : masquer la
  // scrollbar du document sans bloquer la molette. Hors iframe, rien à faire.
  useEffect(() => {
    const embedded =
      window.self !== window.top ||
      new URLSearchParams(window.location.search).get("embed") === "1";
    if (!embedded) return;
    const root = document.documentElement;
    root.classList.add("no-scrollbar");
    return () => root.classList.remove("no-scrollbar");
  }, []);

  // Notification d'un autre client : on recharge la vue server.
  useEffect(() => {
    const onUpdate = () => router.refresh();
    socket.on("choices:update", onUpdate);
    return () => {
      socket.off("choices:update", onUpdate);
    };
  }, [socket, router]);

  /** Après une mutation réussie : notifie les AUTRES clients de la room. */
  function notifyChanged(): void {
    socket.emit("choices:update", { campaignId });
  }

  function onCreated(choice: ChoiceView): void {
    setItems((prev) => [choice, ...prev.filter((c) => c.id !== choice.id)]);
    notifyChanged();
  }

  function onUpdated(choice: ChoiceView): void {
    setItems((prev) => prev.map((c) => (c.id === choice.id ? choice : c)));
    notifyChanged();
  }

  const open = items.filter((c) => c.status === "open");
  const history = items.filter((c) => c.status === "closed" || c.status === "resolved");
  const archived = items.filter((c) => c.status === "archived");

  return (
    <div className="flex flex-col gap-6">
      <p className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span className={connected ? "" : "text-destructive"}>
          {connected ? "Temps réel actif" : "Hors ligne — reconnexion…"}
        </span>
        <span>
          {open.length} ouvert{open.length > 1 ? "s" : ""} · {history.length} clôturé
          {history.length > 1 ? "s" : ""}
          {archived.length > 0 && ` · ${archived.length} archivé${archived.length > 1 ? "s" : ""}`}
        </span>
      </p>

      {isGM && <ChoiceForm campaignId={campaignId} onCreated={onCreated} />}

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
                onUpdated={onUpdated}
              />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="choices-history">
          <h2 id="choices-history" className="text-sm tracking-widest text-muted uppercase">
            Historique
          </h2>
          <div className="flex flex-col gap-3">
            {history.map((choice) => (
              <ChoiceCard
                key={choice.id}
                campaignId={campaignId}
                choice={choice}
                isGM={isGM}
                onUpdated={onUpdated}
              />
            ))}
          </div>
        </section>
      )}

      {archived.length > 0 && (
        <details className="panel px-4 py-3">
          <summary className="cursor-pointer text-sm tracking-widest text-muted uppercase">
            Archives ({archived.length})
          </summary>
          <div className="flex flex-col gap-3 pt-3">
            {archived.map((choice) => (
              <ChoiceCard
                key={choice.id}
                campaignId={campaignId}
                choice={choice}
                isGM={isGM}
                onUpdated={onUpdated}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
