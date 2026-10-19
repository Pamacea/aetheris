import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { TriPanel } from "@/components/tri-panel";
import { FichesApp, type FicheMeta } from "./fiches-app";

/**
 * Module Fiches joueurs (plugin `fiches`).
 * Garde : membre + plugin activé + grant de vue (sinon 404).
 * Liste les entities dont le type référence un JsonTemplate existant.
 */
export default async function FichesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await requireCampaignPlugin(id, "fiches");
  if (!member) notFound();

  const [templates, entities] = await Promise.all([
    prisma.jsonTemplate.findMany({ where: { campaignId: id }, select: { id: true, name: true } }),
    prisma.entity.findMany({
      where: { campaignId: id },
      select: { id: true, title: true, type: true },
      orderBy: { title: "asc" },
    }),
  ]);
  const templateName = new Map(templates.map((t) => [t.id, t.name]));
  const fiches: FicheMeta[] = entities
    .filter((e) => templateName.has(e.type))
    .map((e) => ({ id: e.id, title: e.title, templateName: templateName.get(e.type)! }));

  return (
    <TriPanel>
      <div className="flex h-[calc(100dvh-3.75rem)] min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
          <nav className="flex items-center gap-2 text-xs text-muted">
            <Link href={`/campaign/${id}`} className="hover:text-accent">
              ← Campagne
            </Link>
            <span>/</span>
            <span className="text-foreground">Fiches joueurs</span>
          </nav>
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">
            {member.role === "GM" ? "Mode MJ" : "Mode joueur"}
          </span>
        </div>
        <FichesApp campaignId={id} fiches={fiches} />
      </div>
    </TriPanel>
  );
}
