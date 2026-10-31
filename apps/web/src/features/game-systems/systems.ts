import type { Prisma } from "@prisma/client";
import { PRESET_GAME_SYSTEMS } from "@aetheris/shared";
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
 * Idempotent : `skipDuplicates` ne réécrit jamais une ligne existante.
 */
export async function ensurePresetSystems(): Promise<void> {
  await prisma.gameSystem.createMany({
    data: PRESET_GAME_SYSTEMS.map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      genre: preset.genre,
      isPreset: true,
      ownerId: null,
      defaultTemplates: asJson(preset.templates),
      defaultAssets: asJson(preset.assets),
    })),
    skipDuplicates: true,
  });
}

/** Presets officiels + systèmes homebrew de l'utilisateur (grille de l'assistant). */
export async function listGameSystems(userId: string): Promise<GameSystemOption[]> {
  await ensurePresetSystems();
  return prisma.gameSystem.findMany({
    where: { OR: [{ isPreset: true }, { ownerId: userId }] },
    orderBy: [{ isPreset: "desc" }, { name: "asc" }],
    select: { id: true, name: true, description: true, genre: true, isPreset: true },
  });
}
