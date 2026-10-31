import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/print-button";
import { TiptapContent } from "@/components/tiptap-content";

/** Page imprimable d'un roman : tous les chapitres pour l'auteur, publiés sinon. */
export default async function NovelPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const novel = await prisma.novel.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      chapters: { orderBy: { position: "asc" } },
    },
  });
  if (!novel) notFound();

  const isOwner = session?.user.id === novel.authorId;
  const chapters = isOwner
    ? novel.chapters
    : novel.chapters.filter((chapter) => chapter.status === "published");

  return (
    <>
      <PrintButton />
      <article className="print-page novel-prose mx-auto w-full max-w-[70ch] px-6 py-12">
        {/* Page de titre : le titre seul, « par X » en petit dessous. */}
        <header className="print-title-page">
          <div>
            <h1 className="text-4xl tracking-wide">{novel.title}</h1>
            <p className="mt-3 text-sm text-muted">par {novel.author.name}</p>
          </div>
        </header>
        <div aria-hidden className="print-blank-page py-12" />

        {novel.synopsis && (
          <section className="print-front-matter">
            <h2 className="text-xl tracking-wide">Synopsis</h2>
            <p className="mt-4 text-sm text-muted">{novel.synopsis}</p>
          </section>
        )}

        {chapters.map((chapter) => (
          <section key={chapter.id} className="print-chapter">
            <h2>{chapter.title}</h2>
            <TiptapContent content={(chapter.content as JSONContent | null) ?? null} />
          </section>
        ))}

        {chapters.length === 0 && <p className="text-muted">Aucun chapitre publié.</p>}
      </article>
    </>
  );
}
