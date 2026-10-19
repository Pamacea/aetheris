import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-sm">
      <nav
        className="bar flex h-16 items-center justify-between"
        aria-label="Navigation principale"
      >
        <Link
          href="/"
          className="flex items-center text-lg font-semibold tracking-[0.12em] uppercase"
        >
          <span className="mark-tri" aria-hidden />
          Aetheris
        </Link>
        <div className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#fonctionnalites" className="transition-colors hover:text-foreground">
            Fonctionnalités
          </a>
          <a href="#showcase" className="transition-colors hover:text-foreground">
            En pratique
          </a>
          <a href="#manifeste" className="transition-colors hover:text-foreground">
            Manifeste
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn btn-tri hidden sm:inline-flex">
            Se connecter
          </Link>
          <Link href="/register" className="btn btn-primary">
            Commencer
          </Link>
        </div>
      </nav>
    </header>
  );
}
