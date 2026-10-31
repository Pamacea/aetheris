import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/print-button";
import { TiptapContent } from "@/components/tiptap-content";

/** Page imprimable d'un chapitre : même accès que l'éditeur (publié, ou auteur). */
export default async function ChapterPrintPage({
  params,
}: {
  params: Promise<{ id: string; chId: string }>;
}) {
  const { id, chId } = await params;
  const session = await getSession();

  const novel = await prisma.novel.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true },
  });
  if (!novel) notFound();

  const chapter = await prisma.chapter.findFirst({ where: { id: chId, novelId: id } });
  if (!chapter) notFound();

  const isOwner = session?.user.id === novel.authorId;
  if (!isOwner && chapter.status !== "published") notFound();

  return (
    <>
      <PrintButton />
      <article className="print-page novel-prose mx-auto w-full max-w-[70ch] px-6 py-12">
        {/* Page de titre du chapitre : le texte commence page suivante. */}
        <header className="print-title-page">
          <div>
            <p className="mb-3 text-[0.65rem] tracking-widest text-muted uppercase">
              {novel.title}
            </p>
            <h1 className="text-4xl tracking-wide">{chapter.title}</h1>
          </div>
        </header>

        <TiptapContent content={(chapter.content as JSONContent | null) ?? null} />
        {!chapter.content && <p className="text-muted">Chapitre vide.</p>}
      </article>
    </>
  );
}
