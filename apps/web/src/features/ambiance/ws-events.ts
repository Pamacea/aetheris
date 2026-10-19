import type { AmbianceState } from "@aetheris/shared";

/**
 * Événements WS du module Ambiance — les contrats de `@aetheris/shared`
 * sont hors périmètre de ce module, on augmente donc le registre existant
 * (même mécanisme que `schemas/choices.ts` côté package partagé).
 */
declare module "@aetheris/shared" {
  interface ClientToServerEvents {
    "ambiance:state": (payload: {
      campaignId: string;
      state: AmbianceState;
    }) => Promise<{ ok: true }>;
    "ambiance:playlists-changed": (payload: { campaignId: string }) => Promise<{ ok: true }>;
  }
  interface ServerToClientEvents {
    "ambiance:state": (payload: { campaignId: string; state: AmbianceState }) => void;
    "ambiance:playlists-changed": (payload: { campaignId: string }) => void;
  }
}

export {};
