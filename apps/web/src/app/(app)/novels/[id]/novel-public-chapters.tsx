import Link from "next/link";
import { StatusBadge } from "../status-badge";

interface PublicChapter {
  id: string;
  title: string;
  status: string;
  wordCount: number;
}

/**
 * Bras non-owner de la page roman : lecture publique des chapitres publiés.
 */
export function NovelPublicChapters({
  novel,
  visible,
  chapterHref,
}: {
  novel: { id: string; title: string };
  visible: PublicChapter[];
  chapterHref?: (chapterId: string) => string;
}) {
  const href = chapterHref ?? ((chapterId: string) => `/novels/${novel.id}/chapters/${chapterId}`);

  return visible.length === 0 ? (
    <section className="panel px-4 py-10 text-center text-sm text-muted">
      Aucun chapitre publié pour le moment.
    </section>
  ) : (
    /* Lecture publique : chapitres publiés uniquement */
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
        <span className="mark-tri" aria-hidden />
        Chapitres
      </h2>
      <ul className="flex flex-col">
        {visible.map((c, i) => (
          <li key={c.id} className="border-b border-border">
            <Link
              href={href(c.id)}
              className="flex items-center justify-between gap-3 px-2 py-3 transition hover:bg-card-hover"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="text-xs text-muted">{i + 1}.</span>
                <span className="truncate text-sm">{c.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-[0.65rem] text-muted">
                  {c.wordCount.toLocaleString("fr-FR")} mots
                </span>
                <StatusBadge status={c.status} kind="chapter" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
