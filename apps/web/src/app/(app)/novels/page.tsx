import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listNovelGenres } from "@/features/novels/genres";
import { CreateNovelButton } from "./create-novel-dialog";
import { StatusBadge } from "./status-badge";

export default async function NovelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const genres = await listNovelGenres();

  const novels = await prisma.novel.findMany({
    where: {
      OR: [{ authorId: session.user.id }, { collaborators: { some: { userId: session.user.id } } }],
      ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}),
    },
    include: {
      chapters: { select: { wordCount: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto w-full px-6 lg:w-3/4 flex flex-1 flex-col gap-8 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-wide">
            <span className="mark-tri" aria-hidden />
            Romans
          </h1>
          <p className="text-sm text-muted">
            Studio d&apos;écriture — romans, chapitres, publication.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/novels/export" download className="btn px-3 py-1.5 text-xs">
            Exporter mes romans
          </a>
          <CreateNovelButton genres={genres} />
        </div>
      </header>

      <form className="flex gap-2" action="/novels" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Rechercher un roman…"
          aria-label="Rechercher un roman"
          maxLength={200}
          className="input flex-1"
        />
        <button type="submit" className="btn px-3 py-1.5 text-xs">
          Rechercher
        </button>
      </form>

      {novels.length === 0 ? (
        <section className="panel px-4 py-10 text-center text-sm text-muted">
          {query
            ? `Aucun roman ne correspond à « ${query} ».`
            : "Aucun roman pour l’instant — créez le premier."}
        </section>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {novels.map((n) => {
            const words = n.chapters.reduce((s, c) => s + c.wordCount, 0);
            const published = n.chapters.filter((c) => c.status === "published").length;
            return (
              <li key={n.id}>
                <Link
                  href={`/novels/${n.id}`}
                  className="panel flex h-full gap-4 p-4 transition hover:bg-card-hover"
                >
                  <div className="panel h-24 w-16 shrink-0 overflow-hidden">
                    {n.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl text-muted">
                        <span className="mark-tri" style={{ marginRight: 0 }} aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate font-medium">{n.title}</span>
                      <StatusBadge status={n.status} />
                    </div>
                    {n.synopsis && <p className="line-clamp-2 text-xs text-muted">{n.synopsis}</p>}
                    <p className="mt-auto text-[0.65rem] text-muted">
                      {n.chapters.length} chapitre
                      {n.chapters.length > 1 ? "s" : ""} · {words.toLocaleString("fr-FR")} mots ·{" "}
                      {published} publié{published > 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
