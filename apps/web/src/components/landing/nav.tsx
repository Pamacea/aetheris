import Link from "next/link";
import { DonationButton } from "@/components/donation/DonationButton";

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
        <div className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a
            href="#fonctionnalites"
            aria-label="Fonctionnalités"
            title="Fonctionnalités"
            className="transition-colors hover:text-foreground"
          >
            F
          </a>
          <a
            href="#showcase"
            aria-label="En pratique"
            title="En pratique"
            className="transition-colors hover:text-foreground"
          >
            E
          </a>
          <a
            href="#manifeste"
            aria-label="Manifeste"
            title="Manifeste"
            className="transition-colors hover:text-foreground"
          >
            M
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/library"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Bibliothèque
          </Link>
          <DonationButton
            label="DON"
            className="btn hidden text-muted hover:text-foreground sm:inline-flex"
          />
          <Link href="/register" className="btn btn-primary">
            Commencer
          </Link>
        </div>
      </nav>
    </header>
  );
}
