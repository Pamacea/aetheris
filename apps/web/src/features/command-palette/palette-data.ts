import type { PaletteEntry } from "@/components/command-palette-commands";
import { prisma } from "@/lib/prisma";

/**
 * Entrées de navigation de la palette (Ctrl/Cmd+K) pour l'utilisateur courant.
 * 20 éléments récents par type suffisent à une navigation rapide.
 */
export async function loadPaletteData(
  userId: string,
): Promise<{ campaigns: PaletteEntry[]; novels: PaletteEntry[] }> {
  const [campaigns, novels] = await Promise.all([
    prisma.campaign.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true },
    }),
    prisma.novel.findMany({
      where: {
        OR: [{ authorId: userId }, { collaborators: { some: { userId, role: "editor" } } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true },
    }),
  ]);

  return { campaigns, novels };
}
