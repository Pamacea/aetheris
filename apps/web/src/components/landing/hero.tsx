import Link from "next/link";

/** Mockup CSS d'une scène de campagne (pas d'asset : pure décoration). */
function SceneMockup() {
  const tokens = [
    { top: "28%", left: "34%", color: "var(--accent)" },
    { top: "55%", left: "62%", color: "var(--accent-2)" },
    { top: "68%", left: "25%", color: "var(--muted)" },
    { top: "38%", left: "72%", color: "var(--muted)" },
  ];
  return (
    <div className="panel relative mx-auto mt-14 aspect-[16/9] w-full overflow-hidden" aria-hidden>
      {/* grille de carte */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "3rem 3rem",
        }}
      />
      {/* halo central */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 55% at 45% 50%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)",
        }}
      />
      {/* jetons */}
      {tokens.map((t, i) => (
        <span
          key={i}
          className="absolute h-4 w-4 rotate-45 border border-foreground/60"
          style={{ top: t.top, left: t.left, background: t.color }}
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
