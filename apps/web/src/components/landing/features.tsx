const FEATURES = [
  {
    title: "Wiki interconnecté",
    body: "Notes liées en [[double crochets]], versions, templates et graphe de connaissances — votre Obsidian de campagne, intégré au jeu.",
  },
  {
    title: "Table virtuelle temps réel",
    body: "Scènes PixiJS avec jetons, murs, brouillard de guerre et vision par jeton. Vos joueurs voient la carte bouger en direct.",
  },
  {
    title: "Studio d'écriture",
    body: "Romans et chapitres avec autosave, statuts et publication — un traitement de texte calme pour écrire vos univers.",
  },
  {
    title: "Journal & combat",
    body: "Consignez vos handouts à la main, suivez l'initiative et l'ambiance au même endroit.",
  },
  {
    title: "Fiches & systèmes de jeu",
    body: "Fiches PJ/PNJ personnalisables, macros et systèmes de règles construits dans le builder — D&D ou votre maison.",
  },
  {
    title: "Gratuit, sans carte bancaire",
    body: "Pas d'abonnement, pas de carte bancaire. Vos modèles, vos thèmes et vos systèmes s'exportent en JSON.",
  },
] as const;

export function Features() {
  return (
    <section id="fonctionnalites" className="border-y border-border/60 bg-card/30">
      <div className="section">
        <p className="text-[0.7rem] tracking-[0.3em] text-accent uppercase">
          <span className="mark-tri" aria-hidden />
          Le kit du conteur
        </p>
        <h2 className="mt-4 text-3xl sm:text-4xl">Tout au même endroit</h2>
        <p className="mt-4 text-muted" style={{ width: "min(100%, 42rem)" }}>
          Onze modules qui se parlent&nbsp;: ce que vous écrivez dans le wiki apparaît sur la table,
          et le journal rassemble les handouts que vous y consignez.
        </p>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="panel p-6 transition-colors hover:bg-card-hover">
              <h3 className="text-lg">
                <span className="mark-tri" aria-hidden />
                {f.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
