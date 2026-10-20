import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChapterList } from "./chapter-list";
import { NovelMeta } from "./novel-meta";
import { NovelPublicChapters } from "./novel-public-chapters";
import { StatusBadge } from "../status-badge";
import { IconChevronLeft } from "../icons";

export default async function NovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const novel = await prisma.novel.findUnique({
    where: { id },
    include: {
      chapters: { orderBy: { position: "asc" } },
    },
  });
  if (!novel) notFound();

  const isOwner = session?.user.id === novel.authorId;
  const visible = isOwner ? novel.chapters : novel.chapters.filter((c) => c.status === "published");

  const totalWords = novel.chapters.reduce((s, c) => s + c.wordCount, 0);
  const publishedCount = novel.chapters.filter((c) => c.status === "published").length;
  const progress =
    novel.chapters.length === 0 ? 0 : Math.round((publishedCount / novel.chapters.length) * 100);

  const hasPublicContent = isOwner || novel.status === "published" || publishedCount > 0;

  return (
    <div className="w-full px-6 flex flex-1 flex-col gap-8 py-12">
      <nav className="flex items-center gap-2 text-xs text-muted">
        <Link href="/novels" className="flex items-center gap-1 hover:text-accent">
          <IconChevronLeft className="h-3 w-3" />
          Romans
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate">{novel.title}</span>
      </nav>

      <header className="flex gap-6">
        <div className="panel h-40 w-28 shrink-0 overflow-hidden">
          {novel.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={novel.coverImage}
              alt={`Couverture de ${novel.title}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl text-muted">
              <span className="mark-tri" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {isOwner ? (
            <NovelMeta
              novelId={novel.id}
              title={novel.title}
              synopsis={novel.synopsis}
              status={novel.status}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="min-w-0 flex-1 text-2xl font-medium tracking-wide">{novel.title}</h1>
                <StatusBadge status={novel.status} />
              </div>
              {novel.synopsis && <p className="text-sm text-muted">{novel.synopsis}</p>}
            </div>
          )}
        </div>
      </header>

      {/* Statistiques */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Chapitres" value={String(novel.chapters.length)} />
        <Stat label="Mots au total" value={totalWords.toLocaleString("fr-FR")} />
        <Stat label="Publiés" value={`${publishedCount}/${novel.chapters.length}`} />
        <Stat label="Progression" value={`${progress} %`} />
      </section>

      {isOwner ? (
        <>
          <ChapterList
            novelId={novel.id}
            chapters={novel.chapters.map((c) => ({
              id: c.id,
              title: c.title,
              position: c.position,
              status: c.status,
              wordCount: c.wordCount,
            }))}
          />

          {/* Mots par chapitre */}
          {novel.chapters.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
                <span className="mark-tri" aria-hidden />
                Mots par chapitre
              </h2>
              <ul className="flex flex-col gap-1">
                {novel.chapters.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between border-b border-border pb-1 text-xs"
                  >
                    <span className="truncate text-muted">{c.title}</span>
                    <span className="font-mono text-foreground">
                      {c.wordCount.toLocaleString("fr-FR")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <NovelPublicChapters novel={novel} visible={visible} hasPublicContent={hasPublicContent} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel flex flex-col gap-1 px-3 py-2.5">
      <span className="text-[0.6rem] tracking-widest text-muted uppercase">{label}</span>
      <span className="font-mono text-lg text-accent">{value}</span>
    </div>
  );
}
