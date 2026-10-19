import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stripGmSecrets } from "@/lib/wiki";
import { sanitizeWikiHtml } from "@/lib/sanitize-wiki";
import { blocksToReadableHtml } from "@/features/wiki/readable";

/** Métadonnées du partage public (mots-clés seulement : pas de détail interne). */
export const metadata = { title: "Wiki partagé — Aetheris" };

/**
 * Lecture publique d'une entrée du wiki, sans authentification.
 * Pipeline : gm-secrets retirés → HTML sanitisé → blocs rendus lisibles.
 */
export default async function SharedWikiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await prisma.entity.findUnique({
    where: { shareSlug: slug },
    select: { title: true, contentHtml: true },
  });
  if (!entry) notFound();

  const html = blocksToReadableHtml(sanitizeWikiHtml(stripGmSecrets(entry.contentHtml)));

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <article className="panel p-6 md:p-10" style={{ width: "min(100%, 48rem)" }}>
        <header className="mb-6 border-b border-border pb-4">
          <p className="mb-3 text-[0.65rem] tracking-widest text-muted uppercase">
            <span className="mark-tri" aria-hidden />
            Wiki partagé
          </p>
          <h1 className="text-2xl tracking-wide">{entry.title}</h1>
        </header>

        <div className="wiki-prose" dangerouslySetInnerHTML={{ __html: html }} />

        <footer className="mt-8 border-t border-border pt-4 text-xs text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Se connecter à Aetheris
          </Link>{" "}
          pour éditer ce wiki.
        </footer>
      </article>
    </div>
  );
}
