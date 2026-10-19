import { sceneStateSchema, type ChatMessage, type SceneState } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import type { VttMember } from "./types";

/** Historique de chat + état persisté + membres de la table (Server Component). */
export async function loadVttPageData(campaignId: string): Promise<{
  messages: ChatMessage[];
  initialScene: SceneState | null;
  members: VttMember[];
}> {
  const [chatMessages, sceneRow, memberRows] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { campaignId },
      orderBy: { sentAt: "asc" },
      take: 50,
    }),
    prisma.vttScene.findUnique({ where: { campaignId } }),
    // Sélecteur de propriétaire du jeton (choix parmi les membres).
    prisma.campaignMember.findMany({
      where: { campaignId },
      select: { userId: true, user: { select: { name: true } } },
    }),
  ]);

  const members: VttMember[] = memberRows.map((m) => ({ userId: m.userId, name: m.user.name }));

  const messages: ChatMessage[] = chatMessages.map((m) => ({
    id: m.id,
    authorName: m.authorName,
    content: m.content,
    sentAt: m.sentAt.toISOString(),
  }));

  // Ligne absente ou ancien format → scène neuve (jamais de crash au rendu).
  const parsed = sceneStateSchema.safeParse(sceneRow?.state);
  return { messages, initialScene: parsed.success ? parsed.data : null, members };
}
