import { z } from "zod";
import type { PluginEvent, PluginEventRequest } from "./plugins.js";

/**
 * Contrats d'événements WebSocket (Socket.io, NestJS Gateway).
 * Chaque événement partagé Next.js ↔ NestJS est défini ici.
 */

// ── Rejoindre / session ──────────────────────────────────────────────
// La session est validée à la connexion WS (cookie Better Auth) ;
// l'adhésion à la room campagne est vérifiée côté serveur.
export const campaignJoinSchema = z.object({
  campaignId: z.uuid(),
});
export type CampaignJoin = z.infer<typeof campaignJoinSchema>;

export const presenceJoinedSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(80),
});
export type PresenceJoined = z.infer<typeof presenceJoinedSchema>;

// ── Tokens VTT ───────────────────────────────────────────────────────
/** C→S : déplacement en cours de drag (léger, appliqué aux autres clients). */
export const tokenMoveRequestSchema = z.object({
  campaignId: z.uuid(),
  tokenId: z.string().min(1).max(64),
  x: z.number(),
  y: z.number(),
  rot: z.number().optional(),
});
export type TokenMoveRequest = z.infer<typeof tokenMoveRequestSchema>;

/** S→C : broadcast aux autres clients de la room. */
export const tokenMovedSchema = z.object({
  tokenId: z.string().min(1).max(64),
  x: z.number(),
  y: z.number(),
  rot: z.number().optional(),
});
export type TokenMoved = z.infer<typeof tokenMovedSchema>;

// ── Scènes ───────────────────────────────────────────────────────────
export const sceneChangeSchema = z.object({
  sceneId: z.uuid(),
  activatedBy: z.uuid(), // userId du GM
});
export type SceneChange = z.infer<typeof sceneChangeSchema>;

/**
 * C→S : le MJ active la scène de sa campagne. `sceneId` et `activatedBy`
 * sont résolus côté serveur (session + VttScene) — jamais faits confiance
 * au client.
 */
export const sceneActivateRequestSchema = z.object({
  campaignId: z.uuid(),
});
export type SceneActivateRequest = z.infer<typeof sceneActivateRequestSchema>;

export const sceneTokenSchema = z.object({
  id: z.string().min(1).max(64),
  x: z.number(),
  y: z.number(),
  size: z.number().min(4).max(1024),
  rot: z.number(),
  name: z.string().min(1).max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  hp: z.number().nullable(),
  hpMax: z.number().nullable(),
  noteId: z.string().min(1).max(64).nullable().optional(),
  // .default(null) : les payloads antérieurs (sans les champs) restent valides.
  ac: z.number().int().min(0).max(99).nullable().default(null),
  /** Membre de la campagne propriétaire du jeton (PV/CA) — null = MJ seul. */
  ownerId: z.string().min(1).max(64).nullable().default(null),
});
export type SceneToken = z.infer<typeof sceneTokenSchema>;

export const wallLineSchema = z.array(z.object({ x: z.number(), y: z.number() }));
export type WallLine = z.infer<typeof wallLineSchema>;

export const gridSettingsSchema = z.object({
  type: z.enum(["square", "hex", "none"]),
  size: z.number().min(8).max(512),
  offsetX: z.number(),
  offsetY: z.number(),
});
export type GridSettings = z.infer<typeof gridSettingsSchema>;

/** État complet de la table (snapshot persisté + broadcast). */
export const sceneStateSchema = z.object({
  tokens: z.array(sceneTokenSchema).max(500),
  walls: z.array(wallLineSchema).max(500),
  grid: gridSettingsSchema,
  mapUrl: z.string().max(2048).nullable(),
  fog: z.object({
    on: z.boolean(),
    sightCells: z.number().min(1).max(100),
  }),
  // .default([]) requis : les payloads antérieurs (sans le champ) restent valides.
  theatreNotes: z
    .array(z.object({ id: z.string().min(1).max(64), title: z.string().min(1).max(120) }))
    .max(100)
    .default([]),
});
export type SceneState = z.infer<typeof sceneStateSchema>;

/** C→S : commit d'après un geste utilisateur (persisté + broadcast). */
export const sceneCommitSchema = z.object({
  campaignId: z.uuid(),
  state: sceneStateSchema,
});
export type SceneCommit = z.infer<typeof sceneCommitSchema>;

// ── Dés ──────────────────────────────────────────────────────────────
/** C→S : le serveur tire les dés (seed serveur → anti-cheat). */
export const diceRollRequestSchema = z.object({
  campaignId: z.uuid(),
  expression: z.string().min(1).max(100), // ex: "2d6+3", "1d20 adv", "1d20 + @force"
});
export type DiceRollRequest = z.infer<typeof diceRollRequestSchema>;

/** S→C : résultat du jet, identique pour tous les clients. */
export const diceRollSchema = z.object({
  expression: z.string().min(1).max(100),
  results: z.array(z.number()),
  total: z.number(),
  rollerName: z.string().min(1).max(80),
  seed: z.number().int(),
});
export type DiceRoll = z.infer<typeof diceRollSchema>;

// ── Chat ─────────────────────────────────────────────────────────────
export const chatMessageSchema = z.object({
  id: z.uuid(),
  authorName: z.string().min(1).max(80),
  content: z.string().min(1).max(4000),
  sentAt: z.iso.datetime(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** Payload client → serveur : l'auteur est pris dans la session, jamais client. */
export const chatSendSchema = z.object({
  campaignId: z.uuid(),
  content: z.string().min(1).max(4000),
});
export type ChatSend = z.infer<typeof chatSendSchema>;

// ── Registre des événements (typage client ↔ serveur) ───────────────
export interface ServerToClientEvents {
  "presence:joined": (payload: PresenceJoined) => void;
  "token:moved": (payload: TokenMoved) => void;
  "scene:state": (payload: SceneState) => void;
  "scene:change": (payload: SceneChange) => void;
  "dice:rolled": (payload: DiceRoll) => void;
  "chat:message": (payload: ChatMessage) => void;
  /** Relais générique des plugins (Phase 8) dans la room campagne. */
  "plugin:event": (payload: PluginEvent) => void;
  /** Erreur NestJS (WsException) remontée au client. */
  exception: (payload: { message?: string; status?: number }) => void;
}

export interface ClientToServerEvents {
  "campaign:join": (payload: CampaignJoin) => Promise<{ ok: true; campaignId: string }>;
  "token:move": (payload: TokenMoveRequest) => void;
  "scene:commit": (payload: SceneCommit) => Promise<{ ok: true }>;
  "scene:activate": (payload: SceneActivateRequest) => void;
  "dice:roll": (payload: DiceRollRequest) => void;
  "chat:send": (payload: ChatSend) => Promise<{ ok: true }>;
  "plugin:event": (payload: PluginEventRequest) => void;
}
