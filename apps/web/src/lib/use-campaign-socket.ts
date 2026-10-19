"use client";

import { useEffect, useState } from "react";
import { getCampaignSocket, type CampaignSocket } from "./ws";

interface UseCampaignSocketResult {
  socket: CampaignSocket;
  connected: boolean;
}

// Compteur de consommateurs : la socket singleton ne se déconnecte
// qu'au démontage du dernier (chat + sync simultanés).
let refs = 0;

/**
 * Connexion temps réel de la campagne — active UNIQUEMENT pendant la
 * vie des composants consommateurs (écrans de jeu). Rejoint la room
 * `campaign:${id}` à la connexion ; se déconnecte au démontage du
 * dernier consommateur pour que la socket ne survive pas aux écrans
 * hors jeu.
 */
export function useCampaignSocket(campaignId: string): UseCampaignSocketResult {
  const socket = getCampaignSocket();
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    refs++;
    const onConnect = () => {
      setConnected(true);
      socket.emit("campaign:join", { campaignId });
    };
    const onDisconnect = () => setConnected(false);
    // Pas de log sur connect_error : socket.io retente en boucle (backoff)
    // et le navigateur logge déjà l'échec réseau ; un console.error par
    // tentative déclenche l'overlay Next à chaque restart du serveur.

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      // Clamped : StrictMode (mount/unmount/mount) ne doit jamais
      // passer sous zéro, sinon plus personne ne déconnecterait.
      refs = Math.max(0, refs - 1);
      if (refs === 0) socket.disconnect();
    };
  }, [socket, campaignId]);

  return { socket, connected };
}
