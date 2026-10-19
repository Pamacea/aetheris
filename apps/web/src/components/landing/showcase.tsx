export function Showcase() {
  return (
    <section id="showcase" className="section">
      <p className="text-[0.7rem] tracking-[0.3em] text-accent uppercase">
        <span className="mark-tri" aria-hidden />
        En pratique
      </p>
      <h2 className="mt-4 text-3xl sm:text-4xl">Vos univers, rendus beaux</h2>
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* Fiche personnage */}
        <article className="panel p-6">
          <p className="text-[0.65rem] tracking-[0.2em] text-muted uppercase">Fiche personnage</p>
          <h3 className="mt-3 font-serif text-2xl italic">Seraine d&apos;Orval</h3>
          <p className="mt-1 text-sm text-accent">Mage de bataille · Ordre des Cendres</p>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[
              ["FOR", "12"],
              ["DEX", "15"],
              ["INT", "18"],
            ].map(([k, v]) => (
              <div key={k} className="border border-border bg-background/60 py-3">
                <dt className="text-[0.6rem] tracking-[0.15em] text-muted uppercase">{k}</dt>
                <dd className="mt-1 font-mono text-xl text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-l-2 border-accent-2 pl-4 font-serif text-sm leading-relaxed text-muted italic">
            « Les flammes ne mentent pas — elles réclament seulement qu&apos;on sache les lire. »
          </p>
        </article>

        {/* Entrée de wiki */}
        <article className="panel p-6">
          <p className="text-[0.65rem] tracking-[0.2em] text-muted uppercase">Entrée de wiki</p>
          <h3 className="mt-3 text-2xl">La Cité des Ponts Brisés</h3>
          <div className="mt-4 space-y-3 font-serif text-sm leading-relaxed text-foreground/85">
            <p>
              Trois étages de ponts sur le fleuve <span className="wiki-link">Vael</span>, reliés
              par des ascenseurs à chaîne. Sous la ville basse, la guilde des{" "}
              <span className="wiki-link">Marchands-Cendres</span> tient le marché noir de
              l&apos;ambre.
            </p>
            <p className="text-muted">
              Voir aussi&nbsp;: <span className="wiki-link">[[Seraine d&apos;Orval]]</span> ·{" "}
              <span className="wiki-link">[[Éclipse de Brumaire]]</span>
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[" lieu", "politique", "saison 1"].map((tag) => (
              <span
                key={tag}
                className="border border-border px-2.5 py-1 text-[0.65rem] tracking-wider text-muted uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
