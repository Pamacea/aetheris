# Changelog

Toutes les évolutions notables d'Aetheris sont consignées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et le
[SemVer](https://semver.org/lang/fr/). Les entrées sont générées depuis l'historique
Git (`TYPE: aetheris - vX.Y.Z`) : `RELEASE` = majeur, `UPDATE` = mineur, `PATCH` = correctif.

## [0.6.4] — 2026-11-01

### Corrigé

- **Modèles de fiches** : le modèle créé est ajouté localement à la liste puis sélectionné ; si l'id sélectionné n'est pas encore connu, l'éditeur ne retombe plus sur le premier modèle — les champs ajoutés pouvaient être écrits dans un autre modèle.

### Tests

- **E2E** : helper `createCampaign` aligné sur l'assistant en deux étapes ; sélecteur de propriétaire (menu maison) et libellés de sauvegarde mis à jour. Suite complète : 27/27.

### CI

- `.github/workflows/ci.yml` : job `check` (PostgreSQL de service, `pnpm check`) et job `e2e` (Playwright, démarrage et sondage des serveurs de dev, artefacts en cas d'échec).

## [0.6.3] — 2026-11-01

### Base de données

- Migration additive `20261101090000_schema_0_6_0` : couvre le diff entre les 12 migrations historiques et le schéma 0.6.0 (`Campaign.description`/`visibility`/`gameSystemId`, `JsonTemplate.customCss`, `Entity.shareSlug`, refonte `GameSystem`, `EntityAssignee`, `EntityLink`, `PlayerChoice`, `ChoiceVote`, `Novel.genre`/`tags`/`shareToken`/`shareMode`, `NovelCollaborator`).
- Validée sur PostgreSQL 17 jetable : les 13 migrations s'appliquent sur une base vierge et `prisma migrate diff` ne produit aucun drift. Les données `GameSystem` legacy sont préservées (`authorId` renommé en `ownerId`, copie dans le schéma `legacy_backup` avant la suppression de `schema`).
- `docs/deployment.md` : déploiement, rollback et procédure de baseline Neon (`migrate resolve --applied` sur les 13 migrations, sans DDL). Aucune commande n'a été exécutée sur Neon.

## [0.6.2] — 2026-11-01

### Modifié

- **Documentation** : `ROADMAP.md` réécrite sur l'état vérifié du code (vision, modules, décisions retenues ou abandonnées, historique condensé, prochaines étapes) ; `README.md` aligné sur les scripts et périmètres réels ; landing corrigée (licence MIT, exports réellement livrés, 11 modules, notes de théâtre retirées).
- **CHANGELOG** : entrée 0.6.1 datée, avec ses correctifs de sécurité et ses tests.

## [0.6.1] — 2026-11-01

### Corrigé

- **VTT** : le payload RSC initial est filtré côté serveur par `sceneStateForViewer` (`packages/shared/src/scene-visibility.ts`) ; le joueur ne reçoit plus les murs secrets ni les jetons invisibles.
- **Fiches** : `visibleEntityWhere` appliqué aux pages VTT, wiki (`?note=`) et graphe.
- **Romans** : le token de partage n'est réutilisé que si le mode est inchangé (rotation lors d'un passage lecture → relecture).
- **Bibliothèque** : seuls les romans `published` sont listés.
- **Navigation** : `/library` anonyme n'affiche plus le chrome connecté (Tableau de bord, Studio, Profil, « Chargement… ») mais Bibliothèque, Se connecter et Créer un compte.

### Sécurité

- **WebSocket** : salon `campaign:<id>:gm` ; `scene:commit` diffuse l'état complet au MJ et un état filtré par socket aux joueurs ; `token:moved` filtré ; `fiche:sync` exige l'assignation (ou la propriété du jeton) et bloque `gmOnly` ; `fiche:combat` ciblé (MJ, assignés et propriétaires de jetons).
- **Server Actions** : `saveTokenCombat` exige le grant `vtt` ; `saveTemplateData` exige le grant `fiches` (ou `wiki`) ; `saveTemplateAsSystemPreset` est réservé au MJ ; `listWikiVersions` filtre les entités invisibles.

### Tests

- **VTT** : `packages/shared/tests/scene-visibility.test.ts` et `apps/web/src/features/vtt/page-data.test.ts` couvrent le filtrage de scène ; les tests de la gateway sont étendus.
- **E2E** : `e2e/public.spec.ts` couvre les pages publiques anonymes ; le helper `createCampaign` suit l'assistant en deux étapes.

## [0.6.0] — 2026-10-31

### Ajouté

- **VTT — murs typés** : murs (pierre, caverne, bois), murs secrets MJ et fenêtres, avec sélection, déplacement et suppression des segments et des sommets.
- **VTT — vision par jeton** : portée en cases, vision normale, vision dans le noir ou cône ; les fenêtres ne bloquent pas la ligne de vue. Un joueur ne voit que les jetons dans son champ de vision, le MJ voit tout.
- **VTT — jeton lié à une fiche** : nom, PV et CA issus de la fiche, synchronisation temps réel fiche ↔ jeton.
- **VTT — barre de sorts** : sorts issus des fiches liées, choix de la cible, formule contextuelle, coût de ressource, soin ou dégâts, application des PV/CA et jet de dés serveur.
- **VTT — gestion de carte** : distinction entre URL partagée et aperçu local, suppression de la carte, URL restreinte à `http(s)`.
- **Wiki — notes MJ secrètes** (`gmOnly`) : masquées aux joueurs, badge dédié, partage désactivé.
- **Fiches — assignation** : le MJ assigne une fiche à un ou plusieurs joueurs ; un joueur ne voit que les fiches non secrètes qui lui sont assignées, les autres restent en lecture seule.
- **Modèles de fiches** : grille de 12 colonnes avec placement et redimensionnement des champs (1/4 à pleine largeur), champs `ability` et `inventory`, colonnes `toggle` et `formula`, tags à sélection multiple, images étendues.
- **Constructeur de modèles** : sauvegarde automatique, aperçu, CSS personnalisé sanitisé, presets regroupés par genre, import/export JSON, enregistrement d'un modèle comme preset de système de jeu maison.
- **Évaluateur de formules** partagé, sans `eval`, avec autocomplétion des identifiants de champs.
- **Romans — bibliothèque publique** `/library` : recherche par auteur, genre ou tag.
- **Romans — genres et tags**, éditables depuis la page du roman.
- **Romans — partage par lien** : modes lecture, relecture ou édition, liens révocables, pages publiques en `noindex`.
- **Romans — rôle collaborateur éditeur**, pris en compte dans les listes et la palette de commandes.
- **Campagnes — assistant de création en deux étapes** : description et visibilité privée/publique, puis choix du système de jeu.
- **Systèmes de jeu** : presets D&D 5e, L'Appel de Cthulhu, Alien RPG, narratif, Cyberpunk, Dark Fantasy et Enquête, plus les systèmes maison (caractéristiques, import/export JSON, génération de modèles de fiches).
- **Navigation** : entrée « Bibliothèque » dans la navigation publique, la navigation applicative et la palette de commandes.

### Modifié

- **Éditeur de blocs wiki** : palette intégrée à l'en-tête, blocs dans le flux, suppression des poignées, du redimensionnement et du glisser-déposer de blocs.
- **Fiches structurées** : l'éditeur libre n'apparaît plus en dessous, les notes complémentaires sont repliées.
- **Panneau « Détails & liens »** : métadonnées de l'entrée et rétroliens.
- **Graphe** : les entités « note MJ » sont masquées aux joueurs.
- **VTT** : barre d'outils refondue en icônes, ancrée dans le dock inférieur.
- **Restrictions joueurs** : déplacement limité à leurs propres jetons, modification limitée aux champs de combat de ces jetons.
- **Manifest serveur** : `apps/server/package.json` déclare `"license": "MIT"` au lieu de `"UNLICENSED"`, aligné sur la licence du dépôt.

### Corrigé

- **Fiches — constructeur** : hauteur par défaut correcte des champs (listes et inventaire 10 rangées, textes longs 6, autres 2), totaux Σ et bouton « + Ajouter » de nouveau rendus pour tous les types de listes, type `css` retiré de la palette (les schémas existants restent lisibles), trame de points ambrée.
- **Systèmes de jeu** : le CSS d'un modèle est désormais copié à la création d'une campagne depuis un système.

### Sécurité

- Filtrage serveur des notes MJ, quotas et permissions WebSocket.
- Liens publics limités à `http(s)`, `mailto` et chemins relatifs ; CSS des modèles sanitisé.
- **VTT** : la persistance de l'état complet de scène (murs, brouillard, carte, jetons) est réservée au MJ, y compris hors-ligne ; le joueur passe par `scene:commit`, limité à ses PV/CA/vision.
- **Graphe** : création et suppression de liens réservées au MJ ; les liens touchant une note MJ ne sont plus chargés pour les joueurs.
- **Choix** : le vote est refusé si le module est désactivé pour le joueur.
- **Combat** : `plugin:event` n'accepte plus que le MJ ; les macros `gmOnly` ne sont plus résolues pour les joueurs.
- **Jetons** : nom, taille et bouton de suppression ne sont plus modifiables par le joueur ; la fiche liée reste en lecture seule pour lui.
- **Romans** : métadonnées, publication et suppression réservées à l'auteur ; un éditeur peut créer, renommer, réordonner et éditer le contenu des chapitres, sans pouvoir publier ni supprimer.

### Supprimé

- Composants morts : `DiceIcon` (`components/icons.tsx`), `resolveLinkTarget` (`lib/wiki.ts`).
- Création rapide de modèle retirée : `template-quick-create.tsx`, `template-quick-create-logic.ts` et son test (`features/wiki/templates/`).

### Base de données

- Schéma Prisma étendu : `Campaign.description` / `visibility` / `gameSystemId`, `JsonTemplate.customCss`, `Entity.gmOnly`, `EntityAssignee`, refonte de `GameSystem`, `Novel.genre` / `tags` / `shareToken` / `shareMode`, `NovelCollaborator` et relations utilisateur.
- La migration `20261031150000_wiki_gm_only` ne couvre que `Entity.gmOnly` ; les autres changements de schéma de cette version (`Campaign.description`/`visibility`/`gameSystemId`, `JsonTemplate.customCss`, `EntityAssignee`, refonte `GameSystem`, `Novel.genre`/`tags`/`shareToken`/`shareMode`, `NovelCollaborator`) ne sont pas couverts par une migration versionnée. La base Neon est maintenue par `pnpm db:push` tant qu'aucune migration de baseline n'est générée.

<!--
Modèle pour les prochaines entrées :

## [x.y.z] — AAAA-MM-JJ

### Ajouté

- …

### Modifié

- …

### Corrigé

- …

### Sécurité

- …

### Supprimé

- …
-->

## [0.5.4] — 2026-10-31

### Ajouté

- Prisma : migration des clés d'API.
- Palette de commandes et auth sociale dans le profil.

### Modifié

- **VTT** : navbar conservée sur la table, fenêtres ancrées à la zone de bureau, `?embed=1` préservé dans toutes les navigations de module (wiki, fiches, modèles).
- **Wiki** : refonte — barre d'actions groupée, sidebars repliables persistées, palette de blocs à source unique avec drag & drop, blocs Titre/Paragraphe/Propriétés/Dés/Citation, modèles Personnage/Lieu/Objet en un clic, bouton retour au wiki global.
- **Choix** : latence réduite (actions renvoyant la vue, sans double refresh), résolution/fermeture/archivage par le MJ, `ConfirmDialog` Aetheris (portail) à la place des popups natives.
- **Combat** : scroll unique sans scrollbar, marge basse réelle sous le panneau.
- **Journal** : erreurs locales sans double refresh.
- **Romans / Profil / Accueil** : drawer de chapitres, couverture, impression, onglets de profil.

## [0.5.3] — 2026-10-31

### Corrigé

- Renommage de `apps/web/src/middleware.ts` en `proxy.ts` (Next 16, runtime Node.js) : débloque le déploiement Vercel Services, qui rejetait la fonction Edge `_middleware`.

### Sécurité

- Les fichiers `.env*` locaux sont ignorés.

## [0.5.2] — 2026-10-31

### Corrigé

- Build Vercel : `prisma generate` en postinstall racine, pour que le client Prisma existe avant `next build` (corrige les erreurs TypeScript).
- `turbo.json` : `globalEnv` pour `DATABASE_URL`, `BETTER_AUTH_*`, OAuth, `NEXT_PUBLIC_WS_URL` et `WEB_ORIGIN` (Turbo 2 filtre l'environnement).

## [0.5.1] — 2026-10-31

### Ajouté

- Déploiement Vercel : services `server`/`web`, rewrites `/api/auth` → web, `/api` et `/socket.io` → server, `devCommand` Nest.

### Sécurité

- NestJS : `helmet`, rate limit `@nestjs/throttler` (100 req/60 s), `trust proxy`, cookie de session malformé → 401.
- CORS WebSocket piloté par `WEB_ORIGIN`.

### Corrigé

- App Router : `error.tsx`, `not-found.tsx`, `loading` déplacé sous `(app)` (le `loading` racine cassait les 404 et les 307), garde middleware.
- Formulaires login/register : `role="alert"`, `aria-invalid`/`aria-describedby`, état `pending` toujours réinitialisé, erreurs OAuth affichées.
- Landing : retrait de la mention « Local-first » (le produit ne l'est pas encore), hydratation Dark Reader corrigée.

### Supprimé

- Lockfiles et fichiers workspace dupliqués dans `apps/web` ; `.vercel/` ignoré.

## [0.5.0] — 2026-10-20

### Ajouté

- Fiches : sous-onglets par catégories de templates, dynamiques.
- Journal : filtres Tous / Partagés / Brouillons (MJ).

### Modifié

- Top bar : boutons centrés quand le rail tient, glisser-souris pour défiler, lavis au débordement.
- Desktop pleine largeur : les pages de l'app sortent de la colonne centrée de 1152 px.
- Fil d'Ariane ramené au seul retour « ← Campagne » (le module vit dans la top bar).
- Mobile 375 px : nav campagne en `md+`, sign-out compact, logo icône seule, rail scrollable atteignable.

## [0.4.0] — 2026-10-19

### Modifié

- Une seule top bar : `TopNav` fusionne la navigation globale et les 11 modules de campagne (`aria-current`, scroll horizontal).
- Hauteurs réajustées : `vtt`/`macros` en `100dvh - 3.75rem`, `fiches`/`wiki`/`templates` en `100dvh - 4.25rem`.

### Supprimé

- Barre d'onglets campagne, layout campagne, modale module et routes `@modal` (14 fichiers).

## [0.3.1] — 2026-10-19

### Corrigé

- WebSocket : suppression du `console.error` sur `connect_error` (socket.io réessaie déjà en boucle, le navigateur journalise l'échec).

## [0.3.0] — 2026-10-19

### Ajouté

- Navigation : onglets persistants (layout campagne), hub en toolbar de 11 modules, ouverture des modules en modale.
- Wiki : entrée « Modèles » visible depuis l'en-tête, palette avec scrollbar.
- Studio d'écriture : 14 polices (variables CSS du projet et stacks libres), color picker custom (16 swatches).

### Modifié

- Lore Wiki : lien partagé en texte et actions groupées.
- Scrollbars fines globales alignées sur les tokens de la DA ; hauteurs plein écran recalculées sous la barre d'onglets.

## [0.2.0] — 2026-10-19

> Renumérotation : la ligne 1.x est close après la refonte du frontend (voir
> « Historique antérieur »).

### Ajouté

- **Combat** : module d'initiative temps réel (plugin, 13 tests, e2e de synchronisation MJ → joueur).
- **Fiches** : entités et fiches créées depuis les modèles wiki.
- **Macros** : éditeur, exécution en sandbox (iframe, sans `eval`), chat intégré.
- **Wiki** : palette de blocs en drag & drop, portée MJ réutilisant `gm-secret` (18 tests).
- **Réglages** : bascules des 5 plugins du catalogue (`lore-wiki` non retirable).
- **Permissions** : rôle MJ ↔ PJ en bouton cyclique, cases module alignées.
- **Ambiance** : volumes refondus, import de fichier local (700 Ko, schéma durci).

### Modifié

- **Romans** : statuts en boutons cycliques, toolbar TipTap enrichie (police, taille, tableaux, surlignage, couleur, alignement), titres de chapitre éditables, synopsis en lien souligné.
- **Navigation** : titre du fil d'Ariane cliquable, journal et ambiance basculés en `requireCampaignPlugin` (désactivation du module → 404).
- **UI** : zéro glyphe unicode — icônes SVG custom (romans, transport ambiance).
- **TipTap** : 10 extensions installées (highlight, color, table, align, typo…).

### Corrigé

- Romans : sauvegarde 500 (`toPlainDoc`).

## Historique antérieur (avant renumérotation)

### [1.1.0] — 2026-10-19

- 8 modules reconstruits en parallèle : Journal, Ambiance, Réglages, Permissions, Romans, Wiki (builder de templates, 35 fichiers), VTT (jetons PV/CA/propriétaire, carte par URL distante), Graphe (zoom/pan autour du curseur, arêtes quadratiques).
- Correctifs transverses : `requireCampaignPage` applique les toggles de permissions (refus `view:false` → 404), le joueur ne modifie PV/CA/propriétaire que sur ses propres jetons, `.btn`/`.input`/`.panel` en `@layer components`, `createHandoutSchema` accepte `shared`, plus de « bientôt disponible » pour les romans.

### [1.0.0] — 2026-10-19

- Frontend reconstruit de zéro : shell nav + dashboard + hub, wiki TipTap, graphe, choix joueurs, VTT.
- Fondations conservées : Prisma/Neon, Better Auth, WebSocket Nest, landing, design system Pandémonium.

### [0.2.0] — 2026-10-04 (pré-refonte, numéro réutilisé)

- Purge du frontend `(app)` : dashboard, campagnes, wiki, VTT, romans supprimés.
- Schéma : `EntityLink` (graphe), `Entity.shareSlug` (wiki partageable), `PlayerChoice` + `ChoiceVote`.
- Fondations conservées : auth, WebSocket Nest, landing, helpers, design system.

### [0.1.1] — 2026-10-04

- Checkpoint avant refonte totale du frontend : état vert (landing, VTT, wiki, romans, tests).

### [0.1.0] — 2026-10-04

- Commit initial.
