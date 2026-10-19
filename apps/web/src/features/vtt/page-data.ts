import { sceneStateSchema, type ChatMessage, type SceneState } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";

/** Historique de chat + état persisté de la table (Server Component). */
export async function loadVttPageData(campaignId: string): Promise<{
  messages: ChatMessage[];
  initialScene: SceneState | null;
}> {
  const [chatMessages, sceneRow] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { campaignId },
      orderBy: { sentAt: "asc" },
      take: 50,
    }),
    prisma.vttScene.findUnique({ where: { campaignId } }),
  ]);

  const messages: ChatMessage[] = chatMessages.map((m) => ({
    id: m.id,
    authorName: m.authorName,
    content: m.content,
    sentAt: m.sentAt.toISOString(),
  }));

  // Ligne absente ou ancien format → scène neuve (jamais de crash au rendu).
  const parsed = sceneStateSchema.safeParse(sceneRow?.state);
  return { messages, initialScene: parsed.success ? parsed.data : null };
}
