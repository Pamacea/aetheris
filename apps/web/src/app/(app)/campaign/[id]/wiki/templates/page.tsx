import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplatesBuilder } from "./builder";
import type { WikiTemplateMeta } from "../wiki-app";

export default async function TemplatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId: id } },
    select: { role: true },
  });
  if (!member) notFound();

  const raw = await prisma.jsonTemplate.findMany({
    where: { campaignId: id },
    select: { id: true, name: true, category: true, schema: true },
    orderBy: { name: "asc" },
  });
  const templates: WikiTemplateMeta[] = raw.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    schema: t.schema,
  }));

  return (
    <div className="flex h-[calc(100dvh-3.75rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link href={`/campaign/${id}`} className="hover:text-accent">
            ← Campagne
          </Link>
          <span>/</span>
          <Link href={`/campaign/${id}/wiki`} className="hover:text-accent">
            Lore Wiki
          </Link>
          <span>/</span>
          <span className="text-foreground">Modèles</span>
        </nav>
        <span className="text-[0.65rem] tracking-widest text-muted uppercase">
          {member.role === "GM" ? "Mode MJ" : "Mode joueur"}
        </span>
      </div>
      {member.role === "GM" ? (
        <TemplatesBuilder campaignId={id} initial={templates} />
      ) : (
        <div className="flex flex-1 items-center justify-center p-10 text-center">
          <p className="text-sm text-muted">La gestion des modèles est réservée aux MJ.</p>
        </div>
      )}
    </div>
  );
}
