import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@aetheris/shared";

export type CampaignSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3002";

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
    transports: ["websocket", "polling"],
  });
  return socket;
}
