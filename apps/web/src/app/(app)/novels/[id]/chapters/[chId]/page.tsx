import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNovelRole } from "@/features/novels/access";
import { canReadChapter } from "@/features/novels/logic";
import { ChapterEditor } from "./chapter-editor";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ id: string; chId: string }>;
}) {
  const { id, chId } = await params;
  const session = await getSession();

  const novel = await prisma.novel.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      chapters: {
        select: { id: true, title: true, status: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!novel) notFound();

  const chapter = await prisma.chapter.findFirst({
    where: { id: chId, novelId: id },
  });
  if (!chapter) notFound();

  const role = await getNovelRole(id, session?.user.id);
  if (!canReadChapter(role, novel.status, chapter.status)) notFound();

  // Lecteur : les titres de brouillons ne doivent pas fuiter dans le tiroir.
  const chapters =
    role === null ? novel.chapters.filter((c) => c.status === "published") : novel.chapters;

  return (
    <ChapterEditor
      novelId={novel.id}
      novelTitle={novel.title}
      chapterId={chapter.id}
      chapterTitle={chapter.title}
      content={(chapter.content as JSONContent | null) ?? null}
      status={chapter.status}
      readOnly={role === null}
      chapters={chapters}
    />
  );
}
