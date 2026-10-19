import { z } from "zod";

export const campaignRoleSchema = z.enum(["GM", "PLAYER"]);
export type CampaignRole = z.infer<typeof campaignRoleSchema>;

export const createCampaignSchema = z.object({
  title: z.string().min(1).max(120),
  theme: z.string().min(1).default("pandemonium"),
  customThemeScript: z.string().max(100_000).optional(),
  gameSystem: z.string().min(1).default("custom"),
  coverImage: z.string().max(2_000_000).optional(),
  logo: z.string().max(2_000_000).optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

/** Thèmes natifs de la plateforme. */
export const NATIVE_THEMES = [
  { id: "pandemonium", name: "Pandémonium", description: "Noir charbon, rouge ardent, parchemin" },
  { id: "arcane", name: "Arcane", description: "Bleu profond, argent, étoiles" },
  { id: "verdant", name: "Verdant", description: "Forêt ancienne, mousse, or" },
] as const;
export const nativeThemeSchema = z.enum(NATIVE_THEMES.map((t) => t.id) as [string, ...string[]]);
export type NativeTheme = (typeof NATIVE_THEMES)[number];

/** Systèmes de jeu presets (feuilles de persos, objets, cartes…). */
export const GAME_SYSTEMS = [
  {
    id: "dnd5e",
    name: "Dungeons & Dragons 5e",
    description: "Classes, sorts, équipement, personnages",
  },
  { id: "cocth", name: "Call of Cthulhu", description: "Compétences, sanité, enquête" },
  { id: "cairn", name: "Cairn", description: "OSR léger, inventaire par slot" },
  { id: "custom", name: "Custom", description: "Système vide à définir dans l'éditeur" },
] as const;
export const gameSystemSchema = z.enum(GAME_SYSTEMS.map((s) => s.id) as [string, ...string[]]);
export type GameSystem = (typeof GAME_SYSTEMS)[number];

/** Système de jeu créé par l'utilisateur (feuilles/objets/cartes définis ensuite en campagne). */
export const createGameSystemSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
});
export type CreateGameSystemInput = z.infer<typeof createGameSystemSchema>;

export const gameSystemRecordSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
});
export type GameSystemRecord = z.infer<typeof gameSystemRecordSchema>;

export const campaignSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  inviteCode: z.string(),
  enabledPlugins: z.array(z.string()),
  createdAt: z.iso.datetime(),
});
export type Campaign = z.infer<typeof campaignSchema>;

export const entitySchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
  type: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  contentHtml: z.string().nullable(),
  campaignId: z.uuid(),
});
export type Entity = z.infer<typeof entitySchema>;

export const saveEntitySchema = entitySchema
  .pick({ title: true, type: true, data: true, contentHtml: true })
  .partial({ contentHtml: true });
export type SaveEntityInput = z.infer<typeof saveEntitySchema>;
