import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { prisma } from "@/lib/prisma";
import { TiptapContent } from "@/components/tiptap-content";

/** Un lien partagé n'est jamais destiné à l'indexation. */
export const metadata = {
  title: "Chapitre partagé — Aetheris",
  robots: { index: false, follow: false },
};

/** Lecture publique d'un chapitre partagé : aucun client component, aucune mutation. */
export default async function SharedNovelChapterPage({
  params,
}: {
  params: Promise<{ token: string; chId: string }>;
}) {
  const { token, chId } = await params;

  const novel = await prisma.novel.findFirst({
    where: { shareToken: token },
    select: { id: true, title: true, shareMode: true },
  });
  // Seuls read/review donnent une lecture ; un mode absent n'ouvre jamais les brouillons.
  if (!novel || !novel.shareMode || novel.shareMode === "edit") notFound();

  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chId,
      novelId: novel.id,
      ...(novel.shareMode === "read" ? { status: "published" } : {}),
    },
    select: { id: true, title: true, status: true, content: true },
  });
  if (!chapter) notFound();

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <article className="panel novel-prose p-6 md:p-10" style={{ width: "min(100%, 48rem)" }}>
        <nav className="mb-4 text-xs text-muted">
          <Link href={`/shared/novel/${token}`} className="text-accent hover:underline">
            ← {novel.title}
          </Link>
        </nav>
        <header className="mb-6 border-b border-border pb-4">
          <h1 className="text-2xl tracking-wide">{chapter.title}</h1>
        </header>
        <TiptapContent content={(chapter.content as JSONContent | null) ?? null} />
      </article>
    </div>
  );
}
