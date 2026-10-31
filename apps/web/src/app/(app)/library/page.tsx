import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { mergeGenres } from "@/features/novels/logic";
import { LibraryFilterForm } from "./library-filter-form";

export const metadata = { title: "Bibliothèque — Aetheris" };

type SearchParams = Record<string, string | string[] | undefined>;

/** Un paramètre GET normalisé : première valeur texte, sans espaces. */
function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = param(params.q);
  const auteur = param(params.auteur);
  const genre = param(params.genre);
  const tag = param(params.tag);
  const filtered = Boolean(q || auteur || genre || tag);

  const where = {
    status: "published",
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { synopsis: { contains: q, mode: "insensitive" as const } },
            { author: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(genre ? { genre } : {}),
    ...(auteur ? { author: { name: { contains: auteur, mode: "insensitive" as const } } } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const novels = await prisma.novel.findMany({
    where,
    select: {
      id: true,
      title: true,
      synopsis: true,
      coverImage: true,
      genre: true,
      tags: true,
      author: { select: { name: true } },
      _count: { select: { chapters: { where: { status: "published" } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Facettes : une seule requête. La liste connue passe d'abord, les genres
  // hérités d'une ancienne saisie libre sont ajoutés à la fin.
  const facets = await prisma.novel.findMany({
    where: { status: "published" },
    select: { genre: true, tags: true },
  });
  const genres = mergeGenres(facets.map((n) => n.genre));
  const tagFacets = [...new Set(facets.flatMap((n) => n.tags))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );

  return (
    <div className="mx-auto w-full px-6 lg:w-3/4 flex flex-1 flex-col gap-6 py-8">
      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Bibliothèque
        </h1>
        <p className="text-sm text-muted">
          Les romans publiés sur Aetheris — lecture libre, sans compte.
        </p>
      </header>

      <LibraryFilterForm className="panel flex flex-wrap items-end gap-2 p-3">
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-muted">
          Recherche
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Titre, synopsis, auteur…"
            maxLength={200}
            className="input"
          />
        </label>
        <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs text-muted">
          Auteur
          <input
            type="search"
            name="auteur"
            defaultValue={auteur}
            placeholder="Nom de l’auteur"
            maxLength={120}
            className="input"
          />
        </label>
        <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs text-muted">
          Genre
          <select name="genre" defaultValue={genre} className="input">
            <option value="">Tous</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-32 flex-1 flex-col gap-1 text-xs text-muted">
          Tag
          <input
            type="search"
            name="tag"
            defaultValue={tag}
            list="library-tags"
            placeholder="Tous"
            maxLength={40}
            className="input"
          />
          <datalist id="library-tags">
            {tagFacets.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        {filtered && (
          <div className="flex items-center pb-0.5">
            <Link
              href="/library"
              className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Réinitialiser
            </Link>
          </div>
        )}
      </LibraryFilterForm>

      {novels.length === 0 ? (
        <section className="panel px-4 py-10 text-center text-sm text-muted">
          Aucun roman publié ne correspond à ces filtres.
        </section>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {novels.map((n) => {
            const chapters = n._count.chapters;
            return (
              <li key={n.id}>
                <Link
                  href={`/novels/${n.id}`}
                  className="panel flex h-full gap-3 overflow-hidden p-3 transition hover:bg-card-hover"
                >
                  <div className="h-24 w-16 shrink-0 overflow-hidden bg-card">
                    {n.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted">
                        <span className="mark-tri" style={{ marginRight: 0 }} aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-medium">{n.title}</span>
                    <span className="truncate text-[0.7rem] text-muted">{n.author.name}</span>
                    {n.synopsis && <p className="line-clamp-2 text-xs text-muted">{n.synopsis}</p>}
                    <div className="mt-auto flex flex-wrap items-center gap-1">
                      {n.genre && (
                        <span className="border border-border px-1.5 py-0.5 text-[0.65rem] text-muted">
                          {n.genre}
                        </span>
                      )}
                      {n.tags.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="border border-border px-1.5 py-0.5 text-[0.65rem] text-muted"
                        >
                          {t}
                        </span>
                      ))}
                      <span className="ml-auto text-[0.65rem] text-muted">{chapters} ch.</span>
                    </div>
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
