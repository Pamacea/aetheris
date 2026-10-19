import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { TriPanel } from "@/components/tri-panel";
import { JournalApp } from "./journal-app";

/**
 * Module Journal & Captures (plugin `journal`).
 * Garde : membre + plugin activé (sinon 404). Les joueurs ne voient
 * que les handouts partagés.
 */
export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await requireCampaignPlugin(id, "journal");
  if (!member) notFound();

  const isGM = member.role === "GM";
  const rows = await prisma.journalEntry.findMany({
    where: { campaignId: id, ...(isGM ? {} : { shared: true }) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      shared: true,
      createdAt: true,
    },
  });

  const entries = rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    imageUrl: r.imageUrl,
    shared: r.shared,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <TriPanel>
      <div className="flex h-[calc(100dvh-3.75rem)] min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
          <nav className="flex items-center gap-2 text-xs text-muted">
            <Link href={`/campaign/${id}`} className="hover:text-accent">
              ← Campagne
            </Link>
            <span>/</span>
            <span className="text-foreground">Journal &amp; Captures</span>
          </nav>
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">
            {isGM ? "Mode MJ" : "Mode joueur"}
          </span>
        </div>
        <JournalApp campaignId={id} isGM={isGM} entries={entries} />
      </div>
    </TriPanel>
  );
}
