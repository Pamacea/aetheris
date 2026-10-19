import { z } from "zod";

/**
 * Contrats des modules « plugin » (Phase 8).
 * Un plugin est activable/désactivable par campagne via
 * `Campaign.enabledPlugins` — le core (wiki, VTT, chat) n'est pas concerné.
 */

export interface PluginCatalogEntry {
  /** Stable — valeur dans `Campaign.enabledPlugins` et côté NestJS. */
  id: string;
  name: string;
  description: string;
  /** Route du module (`/campaign/[id]/{path}`) — null tant que non livré. */
  path: string | null;
}

/** Catalogue des plugins étendus (hors modules core). */
export const PLUGIN_CATALOG = [
  {
    id: "combat",
    name: "Combat & Initiative",
    description: "Tracker de tour, initiative, round — sync temps réel",
    path: "combat",
  },
  {
    id: "journal",
    name: "Journal & Captures",
    description: "Handouts et images partagées aux joueurs",
    path: "journal",
  },
  {
    id: "ambiance",
    name: "Ambiance sonore",
    description: "Playlists, lecture synchronisée pour tous",
    path: "ambiance",
  },
  {
    id: "fiches",
    name: "Fiches joueurs",
    description: "Feuille de personnage liée au token, éditable par le joueur",
    path: "fiches",
  },
  {
    id: "macros",
    name: "Constructeur de macros",
    description: "Macros JS sandboxées par campagne, exécutées au chat",
    path: "macros",
  },
] as const satisfies readonly PluginCatalogEntry[];

export type PluginId = (typeof PLUGIN_CATALOG)[number]["id"];

/** Liste des ids pour validation (les payloads WS/DB). */
export const pluginIdSchema = z.enum(PLUGIN_CATALOG.map((p) => p.id) as [PluginId, ...PluginId[]]);

// ── Relais temps réel générique des plugins ──────────────────────────
/**
 * JSON arbitraire MAIS borné (sinon seul `maxHttpBufferSize` socket.io
 * (1 Mo) limitait un payload relayé à toute la room).
 */
const boundedJson: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().max(4_000),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(boundedJson).max(200),
    z.record(z.string().max(128), boundedJson),
  ]),
);

/**
 * C→S : relayé à la room si le plugin est activé pour la campagne.
 * `type` est propre au plugin (ex. `initiative:committed`, `audio:state`).
 */
export const pluginEventRequestSchema = z.object({
  campaignId: z.uuid(),
  pluginId: pluginIdSchema,
  type: z.string().min(1).max(64),
  payload: boundedJson,
});
export type PluginEventRequest = z.infer<typeof pluginEventRequestSchema>;

/** S→C : broadcast dans la room campagne. */
export const pluginEventSchema = z.object({
  pluginId: pluginIdSchema,
  type: z.string().min(1).max(64),
  payload: z.unknown(),
  fromName: z.string().min(1).max(80),
});
export type PluginEvent = z.infer<typeof pluginEventSchema>;
