import { z } from "zod";
import { TOKEN_CONDITIONS, type TokenCondition } from "../conditions.js";
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

/** Vision d'un jeton. `rangeCells: null` → portée globale de la scène
 *  (`fog.sightCells`). `cone` = cône de 90° centré sur `rot`. */
export const tokenSightSchema = z.object({
  enabled: z.boolean().default(true),
  rangeCells: z.number().min(1).max(100).nullable().default(null),
  type: z.enum(["normal", "darkvision", "cone"]).default("normal"),
});
export type TokenSight = z.infer<typeof tokenSightSchema>;

const DEFAULT_SIGHT: TokenSight = { enabled: true, rangeCells: null, type: "normal" };

/** Lumière portée par un jeton : éclaire la carte, pas les silhouettes.
 *  `radiusCells: null` → portée globale du brouillard (`fog.sightCells`). */
export const tokenLightSchema = z.object({
  enabled: z.boolean().default(false),
  radiusCells: z.number().int().min(1).max(60).nullable().default(null),
});
export type TokenLight = z.infer<typeof tokenLightSchema>;

const DEFAULT_LIGHT: TokenLight = { enabled: false, radiusCells: null };

/** Règle commune carte/jeton : http(s) absolu, 2048 caractères max. */
const httpImageUrlSchema = z
  .string()
  .max(2048)
  .refine((u) => u.startsWith("http://") || u.startsWith("https://"), "URL http(s) attendue");

/** URL de carte : http(s) absolu uniquement. Toute autre valeur (`blob:`
 *  d'un aperçu local, `javascript:`, relative) est normalisée en null — un
 *  fichier local ne doit jamais être persisté ni diffusé. */
export const mapUrlSchema = httpImageUrlSchema.nullable().catch(null);
export type MapUrl = z.infer<typeof mapUrlSchema>;

/** Image de jeton : même règle ; champ absent → null (scènes antérieures). */
export const tokenImageUrlSchema = httpImageUrlSchema.nullable().default(null).catch(null);
export type TokenImageUrl = z.infer<typeof tokenImageUrlSchema>;

const TOKEN_CONDITION_IDS = TOKEN_CONDITIONS.map((c) => c.id) as [
  TokenCondition,
  ...TokenCondition[],
];

/** États actifs : IDs connus, doublons retirés, 14 max. Champ absent
 *  (scènes antérieures) → []. Aucun `.catch` : une valeur inconnue est refusée. */
const tokenConditionsSchema = z
  .array(z.enum(TOKEN_CONDITION_IDS))
  .max(TOKEN_CONDITIONS.length)
  .transform((ids) => [...new Set(ids)])
  .default([]);

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
  noteId: z.string().min(1).max(64).nullable().default(null),
  /** Image distante du jeton, recadrée en cercle ; repli couleur + initiale. */
  imageUrl: tokenImageUrlSchema,
  // .default(null) : les payloads antérieurs (sans les champs) restent valides.
  ac: z.number().int().min(0).max(99).nullable().default(null),
  /** Membre de la campagne propriétaire du jeton (PV/CA) — null = MJ seul. */
  ownerId: z.string().min(1).max(64).nullable().default(null),
  // .default(...) : les scènes antérieures voient avec la portée globale.
  sight: tokenSightSchema.default(DEFAULT_SIGHT),
  // .default(...) : champ absent des scènes antérieures → aucune lumière.
  light: tokenLightSchema.default(DEFAULT_LIGHT),
  // .default([]) : champ absent des scènes antérieures → aucun état.
  conditions: tokenConditionsSchema,
});
export type SceneToken = z.infer<typeof sceneTokenSchema>;

/** Style de mur : tous bloquent le déplacement. `window` ne bloque pas la
 *  vision ; `secret` bloque la vision des joueurs et n'est rendu qu'au MJ.
 *  `stone`/`cave`/`wood` sont des variantes visuelles de `wall`. */
export const wallTypeSchema = z.enum(["wall", "stone", "cave", "wood", "secret", "window"]);
export type WallType = z.infer<typeof wallTypeSchema>;

export const wallPointSchema = z.object({ x: z.number(), y: z.number() });

/** Identifiant déterministe d'un ancien mur migré : le même tableau de points
 *  donne le même id à chaque parse, sinon la comparaison avant/après commit
 *  des joueurs échouerait à chaque écriture. */
function legacyWallId(points: unknown): string {
  const body = JSON.stringify(points);
  let hash = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) {
    hash ^= body.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `legacy-${(hash >>> 0).toString(36)}`;
}

export const wallSchema = z.object({
  id: z.string().min(1).max(64),
  type: wallTypeSchema.default("wall"),
  points: z.array(wallPointSchema).min(1).max(2048),
});
export type Wall = z.infer<typeof wallSchema>;

/**
 * Rétrocompatibilité : l'ancien format était un tableau de points (mur plein).
 * `z.preprocess` migre avant validation — aucune scène persistée à réécrire.
 */
export const wallLineSchema = z.preprocess(
  (raw) => (Array.isArray(raw) ? { id: legacyWallId(raw), type: "wall", points: raw } : raw),
  wallSchema,
);
export type WallLine = Wall;

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
  mapUrl: mapUrlSchema,
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

// ── Fiches ↔ jetons ──────────────────────────────────────────────────
/** C→S : la fiche liée vient d'être enregistrée ; le serveur relit Entity + template et diffuse. */
export const ficheSyncRequestSchema = z.object({
  campaignId: z.uuid(),
  entityId: z.uuid(),
});
export type FicheSyncRequest = z.infer<typeof ficheSyncRequestSchema>;

/** S→C : valeurs de la fiche, clés résolues côté serveur. `patch` ne contient
 *  que les valeurs présentes (une valeur absente n'écrase ni jeton ni fiche). */
export const ficheCombatSchema = z.object({
  entityId: z.string().min(1).max(64),
  keys: z.object({
    hp: z.string().nullable(),
    hpMax: z.string().nullable(),
    ac: z.string().nullable(),
  }),
  patch: z.object({
    name: z.string().min(1).max(120).optional(),
    hp: z.number().nullable().optional(),
    hpMax: z.number().nullable().optional(),
    ac: z.number().int().min(0).max(99).nullable().optional(),
  }),
});
export type FicheCombat = z.infer<typeof ficheCombatSchema>;

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
  "fiche:combat": (payload: FicheCombat) => void;
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
  "fiche:sync": (payload: FicheSyncRequest) => void;
  "dice:roll": (payload: DiceRollRequest) => void;
  "chat:send": (payload: ChatSend) => Promise<{ ok: true }>;
  "plugin:event": (payload: PluginEventRequest) => void;
}
