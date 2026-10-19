"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { JOURNAL_CHANGED_EVENT, type PluginEvent } from "@aetheris/shared";
import { useCampaignSocket } from "@/lib/use-campaign-socket";

/** Relais temps réel du journal : écoute `journal:changed` + diffusion. */
export function useJournalSync(campaignId: string) {
  const router = useRouter();
  const { socket } = useCampaignSocket(campaignId);

  // Refus d'un autre client : rafraîchit la liste depuis le serveur.
  useEffect(() => {
    const onPlugin = (ev: PluginEvent) => {
      if (ev.pluginId === "journal" && ev.type === JOURNAL_CHANGED_EVENT) {
        router.refresh();
      }
    };
    socket.on("plugin:event", onPlugin);
    return () => {
      socket.off("plugin:event", onPlugin);
    };
  }, [socket, router]);

  /** Après une mutation réussie : notifie les autres puis recharge. */
  function broadcastChanged(): void {
    socket.emit("plugin:event", {
      campaignId,
      pluginId: "journal",
      type: JOURNAL_CHANGED_EVENT,
      payload: null,
    });
    router.refresh();
  }

  return { broadcastChanged };
}
