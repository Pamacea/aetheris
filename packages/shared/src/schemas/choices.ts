import { z } from "zod";
import "./ws.js";

/**
 * Contrats du suivi des choix joueurs (style Amsel Tome).
 * Le temps réel ne transporte qu'une notification d'invalidation
 * `choices:update` { campaignId } : les données fraîches sont relues
 * côté Next (server actions) à la réception.
 */

/** MJ : création d'un choix (prompt + 2..6 options). */
export const createChoiceSchema = z.object({
  prompt: z.string().trim().min(1).max(500),
  options: z.array(z.string().trim().min(1).max(120)).min(2).max(6),
});
export type CreateChoiceInput = z.infer<typeof createChoiceSchema>;

/** Joueur : un vote par joueur, modifiable tant que le choix est ouvert. */
export const voteChoiceSchema = z.object({
  optionIndex: z.number().int(),
  comment: z.string().trim().max(500).optional(),
});
export type VoteChoiceInput = z.infer<typeof voteChoiceSchema>;

/** MJ : clôture du choix en retenant une option (index clampé côté action). */
export const resolveChoiceSchema = z.object({
  resolvedOption: z.number().int(),
});
export type ResolveChoiceInput = z.infer<typeof resolveChoiceSchema>;

/** C→S puis S→room : invalidation diffusée dans `campaign:${id}`. */
export const choicesUpdateSchema = z.object({
  campaignId: z.uuid(),
});
export type ChoicesUpdate = z.infer<typeof choicesUpdateSchema>;

// ── Registre des événements (augmente ws.ts sans le modifier) ────────
declare module "./ws.js" {
  interface ClientToServerEvents {
    "choices:update": (payload: ChoicesUpdate) => Promise<{ ok: true }>;
  }
  interface ServerToClientEvents {
    "choices:update": (payload: ChoicesUpdate) => void;
  }
}
