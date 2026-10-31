import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNovelRole } from "@/features/novels/access";
import { joinNovelAsEditor } from "@/features/novels/actions";
import { NovelPublicChapters } from "@/app/(app)/novels/[id]/novel-public-chapters";
import { StatusBadge } from "@/app/(app)/novels/status-badge";

/** Le lien partagé peut contenir des brouillons : jamais indexé par les moteurs. */
export const metadata = {
  title: "Roman partagé — Aetheris",
  robots: { index: false, follow: false },
};

/**
 * Accès public à un roman via son token : lecture, relecture ou invitation
 * à rejoindre comme éditeur. Aucune donnée hors du mode choisi.
 */
export default async function SharedNovelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const novel = await prisma.novel.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      synopsis: true,
      status: true,
      coverImage: true,
      shareMode: true,
      author: { select: { name: true } },
      chapters: {
        select: { id: true, title: true, status: true, wordCount: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!novel || !novel.shareMode) notFound();

  const session = await getSession();

  // Un membre du roman qui rouvre le lien éditeur va directement à l'éditeur.
  if (novel.shareMode === "edit") {
    const role = await getNovelRole(novel.id, session?.user.id);
    if (role) redirect(`/novels/${novel.id}`);
  }

  const visible =
    novel.shareMode === "read"
      ? novel.chapters.filter((c) => c.status === "published")
      : novel.chapters;

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <article className="panel p-6 md:p-10" style={{ width: "min(100%, 48rem)" }}>
        <header className="mb-6 flex gap-4 border-b border-border pb-4">
          {novel.coverImage && (
            <img src={novel.coverImage} alt="" className="h-32 w-24 shrink-0 object-cover" />
          )}
          <div className="min-w-0">
            <p className="mb-2 text-[0.65rem] tracking-widest text-muted uppercase">
              <span className="mark-tri" aria-hidden />
              Roman partagé
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl tracking-wide">{novel.title}</h1>
              <StatusBadge status={novel.status} />
            </div>
            {novel.author.name && (
              <p className="mt-1 text-sm text-muted">par {novel.author.name}</p>
            )}
            {novel.synopsis && <p className="mt-3 text-sm text-muted">{novel.synopsis}</p>}
          </div>
        </header>

        {novel.shareMode === "edit" ? (
          session ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                Ce lien ouvre le roman en édition. Rejoignez-le pour le modifier.
              </p>
              <form action={joinNovelAsEditor} className="self-start">
                <input type="hidden" name="token" value={token} />
                <button type="submit" className="btn btn-primary">
                  Rejoindre comme éditeur
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">Connectez-vous pour ouvrir ce roman en édition.</p>
              <Link href="/login" className="btn btn-primary self-start">
                Se connecter
              </Link>
            </div>
          )
        ) : (
          <NovelPublicChapters
            novel={{ id: novel.id, title: novel.title }}
            visible={visible}
            chapterHref={(chId) => `/shared/novel/${token}/ch/${chId}`}
          />
        )}
      </article>
    </div>
  );
}
