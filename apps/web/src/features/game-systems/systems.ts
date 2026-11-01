import type { Prisma } from "@prisma/client";
import { PRESET_GAME_SYSTEM_IDS, PRESET_GAME_SYSTEMS } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";

export interface GameSystemOption {
  id: string;
  name: string;
  description: string | null;
  genre: string;
  isPreset: boolean;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Matérialise les presets en base (ids stables) pour que `Campaign.gameSystemId`
 * puisse les référencer comme n'importe quel système homebrew.
 * Upsert (et non `skipDuplicates`) : une mise à jour du contenu d'un preset en
 * code doit atteindre les lignes déjà seedées.
 */
export async function ensurePresetSystems(): Promise<void> {
  await Promise.all(
    PRESET_GAME_SYSTEMS.map((preset) => {
      const data = {
        name: preset.name,
        description: preset.description,
        genre: preset.genre,
        isPreset: true,
        ownerId: null,
        defaultTemplates: asJson(preset.templates),
        defaultAssets: asJson(preset.assets),
        defaultLore: asJson(preset.lore),
        defaultHandouts: asJson(preset.handouts),
      };
      return prisma.gameSystem.upsert({
        where: { id: preset.id },
        create: { id: preset.id, ...data },
        update: data,
        select: { id: true },
      });
    }),
  );
  // Anciens presets retirés du catalogue (alien, narrative…) : rétrogradés en
  // homebrew, jamais supprimés — les campagnes existantes y pointent encore.
  await prisma.gameSystem.updateMany({
    where: { isPreset: true, id: { notIn: [...PRESET_GAME_SYSTEM_IDS] } },
    data: { isPreset: false },
  });
}

/**
 * Presets officiels + systèmes homebrew de l'utilisateur + presets publics
 * (grille de l'assistant).
 */
export async function listGameSystems(userId: string): Promise<GameSystemOption[]> {
  await ensurePresetSystems();
  return prisma.gameSystem.findMany({
    where: { OR: [{ isPreset: true }, { ownerId: userId }, { isPublic: true }] },
    orderBy: [{ isPreset: "desc" }, { name: "asc" }],
    select: { id: true, name: true, description: true, genre: true, isPreset: true },
  });
}
