import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChapterEditor } from "./chapter-editor";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ id: string; chId: string }>;
}) {
  const { id, chId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const novel = await prisma.novel.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true },
  });
  if (!novel) notFound();

  const chapter = await prisma.chapter.findFirst({
    where: { id: chId, novelId: id },
  });
  if (!chapter) notFound();

  const isOwner = session?.user.id === novel.authorId;
  // Lecture publique : les chapitres publiés sont lisibles par tous,
  // l'édition reste réservée à l'auteur.
  if (!isOwner && chapter.status !== "published") notFound();

  return (
    <ChapterEditor
      novelId={novel.id}
      novelTitle={novel.title}
      chapterId={chapter.id}
      chapterTitle={chapter.title}
      content={(chapter.content as JSONContent | null) ?? null}
      status={chapter.status}
      readOnly={!isOwner}
    />
  );
}
