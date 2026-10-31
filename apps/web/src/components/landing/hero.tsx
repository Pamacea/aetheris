import Link from "next/link";

/** Mockup CSS d'une scène de campagne (pas d'asset : pure décoration). */
function SceneMockup() {
  const tokens = [
    { className: "top-[28%] left-[34%] bg-[var(--accent)]" },
    { className: "top-[55%] left-[62%] bg-[var(--accent-2)]" },
    { className: "top-[68%] left-[25%] bg-[var(--muted)]" },
    { className: "top-[38%] left-[72%] bg-[var(--muted)]" },
  ];
  return (
    <div className="panel relative mx-auto mt-14 aspect-[16/9] w-full overflow-hidden" aria-hidden>
      {/* grille de carte */}
      <div className="absolute inset-0 opacity-40 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      {/* halo central */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_55%_at_45%_50%,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_70%)]" />
      {/* jetons */}
      {tokens.map((t, i) => (
        <span
          key={i}
          className={"absolute h-4 w-4 rotate-45 border border-foreground/60 " + t.className}
        />
      ))}
      {/* panneau latéral simulé */}
      <div className="absolute inset-y-4 right-4 hidden w-44 border border-border bg-card/90 p-3 sm:block">
        <p className="text-[0.6rem] tracking-[0.2em] text-muted uppercase">Scène</p>
        <div className="mt-3 space-y-2">
          {["Garde du pont", "Brume basse", "Marchands"].map((row) => (
            <div key={row} className="flex items-center gap-2 text-xs text-foreground/80">
              <span className="mark-tri" aria-hidden />
              {row}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="section pt-20 text-center sm:pt-28">
      <span className="border border-border px-4 py-1.5 text-[0.7rem] tracking-[0.3em] text-muted uppercase">
        <span className="mark-tri" aria-hidden />
        VTT · Lore · Écriture
      </span>
      <h1 className="mt-8 text-5xl tracking-[0.08em] text-balance uppercase sm:text-7xl">
        Aetheris
      </h1>
      <div className="mt-6 flex items-center justify-center gap-3 text-accent" aria-hidden>
        <span className="h-px w-16 bg-border" />
        <span className="inline-block h-2.5 w-2.5 rotate-45 bg-accent" />
        <span className="h-px w-16 bg-border" />
      </div>
      <p
        className="mx-auto mt-6 text-lg leading-relaxed text-muted"
        style={{ width: "min(100%, 40rem)" }}
      >
        La plateforme tout-en-un pour vos campagnes&nbsp;: wiki interconnecté, table virtuelle en
        temps réel et studio d&apos;écriture de romans.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/register" className="btn btn-primary btn-broken">
          Créer un compte
        </Link>
        <Link href="/login" className="btn btn-tri">
          Se connecter
        </Link>
      </div>
      <SceneMockup />
    </section>
  );
}
