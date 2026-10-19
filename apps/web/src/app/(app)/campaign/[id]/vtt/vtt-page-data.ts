import { notFound } from "next/navigation";
import {
  EMPTY_AMBIANCE_STATE,
  EMPTY_COMBAT_STATE,
  ambianceStateSchema,
  audioTrackSchema,
  combatStateSchema,
  sceneStateSchema,
  type Playlist,
  type SceneState,
} from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { canViewModule } from "@/lib/grants";

export async function loadVttPageData(id: string, userId: string) {
  const [member, campaign, entities, rawTemplates, chatMessages, sceneRow] = await Promise.all([
    prisma.campaignMember.findUnique({
      where: { userId_campaignId: { userId, campaignId: id } },
      select: { role: true, permissions: true },
    }),
    prisma.campaign.findUnique({ where: { id }, select: { enabledPlugins: true } }),
    prisma.entity.findMany({
      where: { campaignId: id },
      select: { id: true, title: true, folder: true, type: true },
      orderBy: { title: "asc" },
    }),
    prisma.jsonTemplate.findMany({
      where: { campaignId: id },
      select: { id: true, name: true, category: true },
      orderBy: { name: "asc" },
    }),
    prisma.chatMessage.findMany({
      where: { campaignId: id },
      orderBy: { sentAt: "asc" },
      take: 50,
    }),
    prisma.vttScene.findUnique({ where: { campaignId: id } }),
  ]);
  if (!member || !campaign) notFound();

  // Palette : note → nom du template associé (Entity.type = id du template).
  // `block-lib` (bibliothèque de blocs) exclue : ce n'est pas une note.
  const templateNames = new Map(rawTemplates.map((t) => [t.id, t.name]));
  const paletteNotes = entities
    .filter((e) => e.type !== "block-lib")
    .map((e) => ({
      id: e.id,
      title: e.title,
      folder: e.folder,
      templateName: templateNames.get(e.type) ?? null,
    }));
  // Modèle du bouton « + PNJ » : template de catégorie « Personnages » (casse
  // ignorée) — sinon la palette crée une note libre.
  const pnjTemplateId =
    rawTemplates.find((t) => t.category?.trim().toLowerCase() === "personnages")?.id ?? null;

  // Gating W4 (identique à VttModals) : plugin activé + grant de vue.
  const canOpen = (pluginId: string) =>
    campaign.enabledPlugins.includes(pluginId) &&
    canViewModule(member.permissions, pluginId, member.role);

  // États initiaux des modales — fetch uniquement si le plugin est visible.
  const [encounterRow, playlistRows, ambianceRow] = await Promise.all([
    canOpen("combat")
      ? prisma.campaignEncounter.findUnique({
          where: { campaignId: id },
          select: { state: true },
        })
      : Promise.resolve(null),
    canOpen("ambiance")
      ? prisma.ambiancePlaylist.findMany({
          where: { campaignId: id },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, tracks: true, createdAt: true },
        })
      : Promise.resolve(null),
    canOpen("ambiance")
      ? prisma.campaignAmbiance.findUnique({
          where: { campaignId: id },
          select: { state: true },
        })
      : Promise.resolve(null),
  ]);

  const messages = chatMessages.map((m) => ({
    id: m.id,
    authorName: m.authorName,
    content: m.content,
    sentAt: m.sentAt.toISOString(),
  }));

  // État persisté de la table (Phase 6) — repli sur l'état vide.
  const parsed = sceneStateSchema.safeParse(sceneRow?.state);
  const initialScene: SceneState | null = parsed.success ? parsed.data : null;

  const combatParsed = combatStateSchema.safeParse(encounterRow?.state);
  const playlists: Playlist[] = (playlistRows ?? []).flatMap((r) => {
    const tracks = parseTracks(r.tracks);
    return tracks ? [{ id: r.id, name: r.name, tracks, createdAt: r.createdAt.toISOString() }] : [];
  });
  const ambianceParsed = ambianceStateSchema.safeParse(ambianceRow?.state);

  const modals = {
    campaignId: id,
    isGM: member.role === "GM",
    enabledPlugins: campaign.enabledPlugins,
    permissions: member.permissions,
    initialCombat: canOpen("combat")
      ? combatParsed.success
        ? combatParsed.data
        : EMPTY_COMBAT_STATE
      : null,
    initialAmbiance: canOpen("ambiance")
      ? {
          playlists,
          state: ambianceParsed.success ? ambianceParsed.data : EMPTY_AMBIANCE_STATE,
        }
      : null,
  };

  return { member, entities, paletteNotes, pnjTemplateId, messages, initialScene, modals };
}

/** tracks (Json) → AudioTrack[] ; ligne corrompue = playlist ignorée. */
function parseTracks(raw: unknown): Playlist["tracks"] | null {
  if (!Array.isArray(raw)) return null;
  const out: Playlist["tracks"] = [];
  for (const item of raw) {
    const parsed = audioTrackSchema.safeParse(item);
    if (!parsed.success) return null;
    out.push(parsed.data);
  }
  return out;
}
