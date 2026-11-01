import Link from "next/link";

const LINK_CLASS = "text-foreground underline underline-offset-4 hover:text-accent";

const STEPS = [
  {
    title: "Créer un compte ou se connecter",
    body: (
      <>
        Inscrivez-vous avec{" "}
        <Link href="/register" className={LINK_CLASS}>
          la création de compte
        </Link>{" "}
        ou{" "}
        <Link href="/login" className={LINK_CLASS}>
          connectez-vous
        </Link>
        . Un compte suffit pour créer campagnes et romans.
      </>
    ),
  },
  {
    title: "Créer ou rejoindre une campagne",
    body: (
      <>
        Depuis le{" "}
        <Link href="/dashboard" className={LINK_CLASS}>
          tableau de bord
        </Link>
        , choisissez « Créer une campagne » pour suivre l’assistant, ou « Rejoindre » si un MJ vous
        a donné un code. Pour essayer sans rien préparer, lancez la « Campagne de démonstration » :
        wiki lié, handout, scène et modèle de fiche sont déjà en place.
      </>
    ),
  },
  {
    title: "Inviter les joueurs avec le code",
    body: (
      <>
        Dans la campagne, ouvrez Réglages : le code d’invitation se copie en un clic. Vos joueurs le
        saisissent via « Rejoindre » sur leur tableau de bord. Régénérer le code invalide
        immédiatement l’ancien.
      </>
    ),
  },
  {
    title: "Activer les modules utiles",
    body: (
      <>
        Réglages → Modules. Le Lore Wiki est le socle, toujours actif. Activez ensuite Journal,
        Fiches, Combat, Ambiance ou Macros selon votre table. Un module désactivé renvoie une page
        introuvable, joueurs compris.
      </>
    ),
  },
  {
    title: "Créer un modèle de fiche",
    body: (
      <>
        Ouvrez Wiki → Modèles, créez un modèle (par exemple « Personnage ») puis ajoutez ses champs
        : texte, nombre, points de vie, classe d’armure. Une fiche est une entrée wiki basée sur ce
        modèle ; le module Fiches les regroupe et les assigne aux joueurs.
      </>
    ),
  },
  {
    title: "Préparer une scène",
    body: (
      <>
        Dans Table, l’outil Grille importe une carte et règle la grille. L’outil Tokens pose les
        combattants. Renseignez les PV et la CA dans l’en-tête du jeton : le combat et les fiches
        reprennent ces valeurs.
      </>
    ),
  },
  {
    title: "Lancer le combat",
    body: (
      <>
        Ouvrez Combat, ajoutez les combattants (nom et PV max), jetez l’initiative puis avancez les
        tours. Seul le MJ pilote le combat ; les joueurs suivent l’état en direct.
      </>
    ),
  },
  {
    title: "Partager des handouts et gérer les permissions",
    body: (
      <>
        Journal : créez un handout et cochez « Partagé » pour le rendre visible aux joueurs.
        Permissions : refusez un module à un joueur ou ouvrez-le en lecture seule, puis vérifiez le
        rendu de son côté.
      </>
    ),
  },
] as const;

/** Guide court du MJ novice : étapes concrètes, liens internes vérifiés. */
export default function AidePage() {
  return (
    <div className="mx-auto w-full px-6 lg:w-3/4 flex flex-1 flex-col gap-8 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Aide du MJ
        </h1>
        <p className="text-sm text-muted">
          Huit étapes pour ouvrir une table, inviter vos joueurs et lancer votre première session.
          Aucune préparation lourde n’est nécessaire.
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="panel flex flex-col gap-2 p-4">
            <h2 className="text-sm font-medium">
              <span className="mr-2 text-accent" aria-hidden>
                {index + 1}.
              </span>
              {step.title}
            </h2>
            <p className="text-sm text-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <p className="text-xs text-muted">
        Astuce : dans une campagne, les touches 1 à 9 ouvrent les modules du dock. Le code
        d’invitation et la liste des modules restent dans Réglages.
      </p>
    </div>
  );
}
