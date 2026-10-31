import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@aetheris/shared";

export type CampaignSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Prod (Vercel services) : même origine, le rewrite /socket.io route vers Nest.
// En dev, Next (:3001) et Nest (:3002) sont séparés.
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3002");

let socket: CampaignSocket | null = null;

/**
 * Socket singleton (autoConnect : la connexion est pilotée par
 * `useCampaignSocket`, active uniquement sur les écrans de jeu).
 * Cookies Better Auth envoyés (withCredentials) → auth côté gateway.
 */
export function getCampaignSocket(): CampaignSocket {
  socket ??= io(WS_URL, {
    autoConnect: false,
    withCredentials: true,
    // Vercel Functions ne supporte pas le long-polling Socket.IO.
    transports: ["websocket"],
  });
  return socket;
}
