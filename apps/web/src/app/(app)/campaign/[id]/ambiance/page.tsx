import Link from "next/link";
import {
  EMPTY_AMBIANCE_STATE,
  ambianceStateSchema,
  audioTrackSchema,
  type AmbianceState,
  type Playlist,
} from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignPage } from "@/features/campaigns/require-member";
import { AmbianceApp } from "@/features/ambiance/ambiance-app";

/**
 * Module Ambiance sonore : playlists par campagne + lecture synchronisée.
 * Lecture ici (server) ; les mutations vivent dans features/ambiance.
 * Le MJ pilote, l'état temps réel part par `ambiance:state` (gateway).
 */
export default async function AmbiancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member } = await requireCampaignPage(id, "ambiance");
  const isGM = member.role === "GM";

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
      ? [{ id: r.id, name: r.name, tracks: parsed, createdAt: r.createdAt.toISOString() }]
      : [];
  });

  const stateParsed = ambianceStateSchema.safeParse(row?.state);
  const initial: AmbianceState = stateParsed.success ? stateParsed.data : EMPTY_AMBIANCE_STATE;

  return (
    <div className="bar flex flex-1 flex-col gap-6 py-12">
      <nav className="text-xs text-muted" aria-label="Fil d'ariane">
        <Link href={`/campaign/${id}`} className="hover:text-accent">
          ← Campagne
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Ambiance sonore</span>
      </nav>

      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Ambiance sonore
        </h1>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="border border-accent/60 px-2 py-0.5 tracking-widest text-accent uppercase">
            {isGM ? "MJ" : "Joueur"}
          </span>
          <span>
            {isGM
              ? "Créez des playlists, associez-en une à la scène, puis pilotez la lecture."
              : "La lecture suit le MJ en temps réel — « Mon volume » reste personnel."}
          </span>
        </p>
      </header>

      <AmbianceApp campaignId={id} isGM={isGM} playlists={playlists} initialState={initial} />
    </div>
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
