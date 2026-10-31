import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNovelRole } from "@/features/novels/access";
import { canReadNovel } from "@/features/novels/logic";
import { listNovelGenres } from "@/features/novels/genres";
import { ChapterList } from "./chapter-list";
import { NovelCover } from "./novel-cover";
import { NovelMeta } from "./novel-meta";
import { NovelPublicChapters } from "./novel-public-chapters";
import { NovelShare } from "./novel-share";
import { NovelTaxonomy } from "./novel-taxonomy";
import { StatusBadge } from "../status-badge";
import { IconChevronLeft } from "../icons";

export default async function NovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const h = await headers();
  const baseUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  const novel = await prisma.novel.findUnique({
    where: { id },
    include: {
      // Métadonnées seules : ne charge pas le JSON TipTap de chaque chapitre.
      chapters: {
        select: { id: true, title: true, position: true, status: true, wordCount: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!novel) notFound();

  const role = await getNovelRole(id, session?.user.id);
  if (!canReadNovel(role, novel.status)) notFound();

  const canEdit = role !== null;
  const genres = canEdit ? await listNovelGenres() : [];
  const visible = canEdit ? novel.chapters : novel.chapters.filter((c) => c.status === "published");

  const totalWords = visible.reduce((s, c) => s + c.wordCount, 0);
  const publishedCount = novel.chapters.filter((c) => c.status === "published").length;
  const progress =
    novel.chapters.length === 0 ? 0 : Math.round((publishedCount / novel.chapters.length) * 100);

  return (
    <div className="mx-auto w-full px-6 lg:w-3/4 flex flex-1 flex-col gap-8 py-12">
      <nav className="flex items-center gap-2 text-xs text-muted">
        <Link
          href={canEdit ? "/novels" : "/library"}
          className="flex items-center gap-1 hover:text-accent"
        >
          <IconChevronLeft className="h-3 w-3" />
          {canEdit ? "Romans" : "Bibliothèque"}
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate">{novel.title}</span>
      </nav>

      <header className="flex gap-6">
        <NovelCover
          novelId={novel.id}
          coverImage={novel.coverImage}
          title={novel.title}
          editable={canEdit}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {canEdit ? (
            <>
              <NovelMeta
                novelId={novel.id}
                title={novel.title}
                synopsis={novel.synopsis}
                status={novel.status}
                actions={
                  role === "author" ? (
                    <NovelShare
                      novelId={novel.id}
                      token={novel.shareToken}
                      mode={novel.shareMode}
                      baseUrl={baseUrl}
                    />
                  ) : undefined
                }
              />
              {/* Poussé en bas : la ligne Genre/Tags s'aligne sur le bas de la
                  couverture (colonne étirée à la hauteur de l'image). */}
              <div className="mt-auto">
                <NovelTaxonomy
                  novelId={novel.id}
                  genre={novel.genre}
                  tags={novel.tags}
                  genres={genres}
                />
              </div>
            </>
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

      {/* Barre de statut condensée */}
      <section className="panel flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 text-xs text-muted">
        <span>
          <span className="font-mono text-sm text-foreground">{visible.length}</span> chapitres
        </span>
        <span>
          <span className="font-mono text-sm text-foreground">
            {totalWords.toLocaleString("fr-FR")}
          </span>{" "}
          mots
        </span>
        {canEdit && (
          <span>
            <span className="font-mono text-sm text-accent">{progress} %</span> publiés
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <StatusBadge status={novel.status} />
        </span>
      </section>

      {canEdit ? (
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
      ) : (
        <NovelPublicChapters novel={{ id: novel.id, title: novel.title }} visible={visible} />
      )}
    </div>
  );
}
