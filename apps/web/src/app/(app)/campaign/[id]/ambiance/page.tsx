import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  EMPTY_AMBIANCE_STATE,
  ambianceStateSchema,
  audioTrackSchema,
  type AmbianceState,
  type Playlist,
} from "@aetheris/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { TriPanel } from "@/components/tri-panel";
import { AmbianceApp } from "./ambiance-app";

/**
 * Module Ambiance sonore (plugin `ambiance`).
 * Garde : membre + plugin activé pour la campagne (sinon 404).
 * Playlists par scène (une scène par campagne) + lecture synchronisée.
 */
export default async function AmbiancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await requireCampaignPlugin(id, "ambiance");
  if (!member) notFound();

  const [rows, row] = await Promise.all([
    prisma.ambiancePlaylist.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, tracks: true, createdAt: true },
    }),
    prisma.campaignAmbiance.findUnique({
      where: { campaignId: id },
      select: { state: true },
    }),
  ]);

  const playlists: Playlist[] = rows.flatMap((r) => {
    const parsed = parseTracks(r.tracks);
    return parsed
      ? [
          {
            id: r.id,
            name: r.name,
            tracks: parsed,
            createdAt: r.createdAt.toISOString(),
          },
        ]
      : [];
  });

  const stateParsed = ambianceStateSchema.safeParse(row?.state);
  const initial: AmbianceState = stateParsed.success ? stateParsed.data : EMPTY_AMBIANCE_STATE;

  return (
    <TriPanel>
      <div className="flex h-[calc(100dvh-3.75rem)] min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
          <nav className="flex items-center gap-2 text-xs text-muted">
            <Link href={`/campaign/${id}`} className="hover:text-accent">
              ← Campagne
            </Link>
            <span>/</span>
            <span className="text-foreground">Ambiance sonore</span>
          </nav>
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">
            {member.role === "GM" ? "Mode MJ" : "Mode joueur"}
          </span>
        </div>
        <AmbianceApp
          campaignId={id}
          isGM={member.role === "GM"}
          playlists={playlists}
          initialState={initial}
        />
      </div>
    </TriPanel>
  );
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
