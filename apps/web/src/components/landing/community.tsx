export function Community() {
  return (
    <section id="manifeste" className="border-y border-border/60 bg-card/30">
      <div className="section text-center">
        <p className="text-[0.7rem] tracking-[0.3em] text-accent uppercase">
          <span className="mark-tri" aria-hidden />
          Manifeste
        </p>
        <h2
          className="mx-auto mt-4 text-3xl text-balance sm:text-4xl"
          style={{ width: "min(100%, 46rem)" }}
        >
          Un outil devrait appartenir à ceux qui racontent
        </h2>
        <p
          className="mx-auto mt-5 leading-relaxed text-muted"
          style={{ width: "min(100%, 44rem)" }}
        >
          Aetheris est en accès anticipé, construit avec ses utilisateurs. Pas d&apos;actionnaire à
          satisfaire, pas de venture capital&nbsp;: un logiciel de jeu, maintenu par des gens qui
          jouent. Ce que vous écrivez vous appartient. Modèles, thèmes et systèmes s&apos;exportent
          en JSON.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted">
          <span>
            <span className="mark-tri" aria-hidden />
            Accès anticipé public
          </span>
          <span>
            <span className="mark-tri" aria-hidden />
            Open source · MIT
          </span>
          <span>
            <span className="mark-tri" aria-hidden />
            Modèles, thèmes et systèmes exportables
          </span>
        </div>
      </div>
    </section>
  );
}
