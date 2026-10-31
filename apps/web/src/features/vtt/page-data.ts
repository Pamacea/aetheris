import {
  sceneStateForViewer,
  sceneStateSchema,
  templateSchemaSchema,
  type CampaignRole,
  type ChatMessage,
  type SceneState,
  type TemplateSchema,
} from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { visibleEntityWhere } from "@/features/fiches/access";
import { hydrateTokens } from "./entity-link";
import type { VttEntity, VttMember } from "./types";

/**
 * Historique de chat + état persisté + membres + fiches liables
 * (Server Component). Un joueur ne reçoit jamais une fiche `gmOnly` ni une
 * fiche assignée à un autre joueur.
 */
export async function loadVttPageData(
  campaignId: string,
  role: CampaignRole,
  userId: string,
): Promise<{
  messages: ChatMessage[];
  initialScene: SceneState | null;
  members: VttMember[];
  entities: VttEntity[];
}> {
  const [chatMessages, sceneRow, memberRows, entityRows] = await Promise.all([
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
    prisma.entity.findMany({
      where: { campaignId, ...visibleEntityWhere(role, userId) },
      orderBy: { title: "asc" },
      take: 500,
      select: { id: true, title: true, type: true, data: true },
    }),
  ]);

  const members: VttMember[] = memberRows.map((m) => ({ userId: m.userId, name: m.user.name }));

  // Schémas des templates distincts en une requête : sans eux, les clés
  // custom (« PV », « Classe d'armure »…) des fiches ne sont pas résolues.
  const types = [...new Set(entityRows.map((e) => e.type))];
  const templateRows = types.length
    ? await prisma.jsonTemplate.findMany({
        where: { campaignId, id: { in: types } },
        select: { id: true, schema: true },
      })
    : [];
  const schemas = new Map<string, TemplateSchema>();
  for (const template of templateRows) {
    const parsed = templateSchemaSchema.safeParse(template.schema);
    if (parsed.success) schemas.set(template.id, parsed.data);
  }

  const entities: VttEntity[] = entityRows.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    data:
      e.data && typeof e.data === "object" && !Array.isArray(e.data)
        ? (e.data as Record<string, unknown>)
        : {},
    schema: schemas.get(e.type) ?? null,
  }));

  const messages: ChatMessage[] = chatMessages.map((m) => ({
    id: m.id,
    authorName: m.authorName,
    content: m.content,
    sentAt: m.sentAt.toISOString(),
  }));

  // Ligne absente ou ancien format → scène neuve (jamais de crash au rendu).
  const parsed = sceneStateSchema.safeParse(sceneRow?.state);
  let initialScene: SceneState | null = parsed.success ? parsed.data : null;
  // Même filtrage que le broadcast socket : un joueur ne reçoit jamais les
  // murs secrets, les notes de théâtre ni les jetons hors de sa vision.
  if (initialScene) {
    initialScene = sceneStateForViewer(initialScene, {
      isGM: role === "GM",
      userId,
      tokenOwners: new Map(initialScene.tokens.map((t) => [t.id, t.ownerId] as const)),
    });
    // Hydratation initiale : la fiche liée est la source du nom/PV/PV max/CA.
    // Le même helper rejoue l'hydratation sur `scene:state` (socket) ; les
    // sauvegardes de fiche arrivent ensuite par `fiche:sync` → `fiche:combat`.
    initialScene = { ...initialScene, tokens: hydrateTokens(initialScene.tokens, entities) };
  }

  return { messages, initialScene, members, entities };
}
