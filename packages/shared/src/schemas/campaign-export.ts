import { z } from "zod";

/**
 * Contrat d'export / import de campagne (Phase 10) — archive ZIP JSON
 * contenant `campaign.json` : lore (entities), templates, scène.
 * L'import crée une NOUVELLE campagne : jamais de modification en place,
 * et toute écriture est précédée d'une validation Zod complète
 * (aucune écriture partielle possible).
 */

/** Version du format — une archive d'une autre version est refusée. */
export const CAMPAIGN_EXPORT_VERSION = 1;

const exportEntitySchema = z.object({
  title: z.string().min(1).max(200),
  type: z.string().min(1).max(120),
  data: z.record(z.string(), z.unknown()),
  contentHtml: z.string().nullable(),
  folder: z.string().nullable(),
});

const exportTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().nullable(),
  schema: z.unknown(),
});

const exportSceneSchema = z.object({
  state: z.unknown(),
});

export const campaignExportSchema = z.object({
  version: z.literal(CAMPAIGN_EXPORT_VERSION),
  campaign: z.object({
    title: z.string().min(1).max(120),
    theme: z.string().min(1).max(64),
    gameSystem: z.string().min(1).max(64),
    enabledPlugins: z.array(z.string().min(1).max(64)).max(50),
  }),
  entities: z.array(exportEntitySchema).max(10_000),
  templates: z.array(exportTemplateSchema).max(1_000),
  scene: exportSceneSchema.nullable(),
});
export type CampaignExport = z.infer<typeof campaignExportSchema>;

/**
 * Rows minimales lues en base pour construire l'archive.
 * Types volontairement larges (`unknown`) : c'est le schéma qui tranche.
 */
export interface CampaignExportSource {
  campaign: CampaignExport["campaign"];
  entities: ReadonlyArray<{
    title: string;
    type: string;
    data: unknown;
    contentHtml: string | null;
    folder: string | null;
  }>;
  templates: ReadonlyArray<{
    name: string;
    category: string | null;
    schema: unknown;
  }>;
  scene: { state: unknown } | null;
}

/**
 * Assemble puis valide l'archive (throw ZodError si la source est
 * incohérente). Fonction pure — testée dans
 * `apps/server/test/campaign-export.spec.ts`.
 */
export function buildCampaignExport(source: CampaignExportSource): CampaignExport {
  return campaignExportSchema.parse({
    version: CAMPAIGN_EXPORT_VERSION,
    ...source,
  });
}
