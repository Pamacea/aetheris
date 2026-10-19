import Link from "next/link";

export function Cta() {
  return (
    <>
      <section className="border-t border-border/60">
        <div className="section text-center">
          <h2 className="text-3xl text-balance sm:text-4xl">
            Votre prochaine campagne commence ici
          </h2>
          <p
            className="mx-auto mt-4 leading-relaxed text-muted"
            style={{ width: "min(100%, 36rem)" }}
          >
            Création en une minute. Rien à installer, rien à payer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/register" className="btn btn-primary btn-broken">
              Créer un compte
            </Link>
            <Link href="/login" className="btn btn-tri">
              Se connecter
            </Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-border">
        <div className="bar flex flex-col items-center justify-between gap-4 py-8 text-xs text-muted sm:flex-row">
          <p>
            <span className="mark-tri" aria-hidden />
            Aetheris — VTT &amp; Lore Studio
          </p>
          <nav className="flex gap-6" aria-label="Pied de page">
            <Link href="/login" className="transition-colors hover:text-foreground">
              Connexion
            </Link>
            <Link href="/register" className="transition-colors hover:text-foreground">
              Inscription
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
