# Audit Aetheris 0.6.0

> Référence : commit `fcd2ff5` (`UPDATE: aetheris - v0.6.0`), 2026-10-31.
> Audit statique : aucun code applicatif modifié par les auditeurs. Le code est la
> source de vérité ; les documents qui le contredisent sont listés au §6.

## 1. Base de données et migrations

### Constat

`packages/database/prisma/migrations/` contient 12 migrations :

| Migration                              | Contenu réel                                                           |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `20261004134234_init`                  | socle (User, Campaign, Entity, Novel, Chapter, Handout, VttScene…)     |
| `20261004142103_add_campaign_theming`  | thème de campagne                                                      |
| `20261004151233_add_game_system`       | première version de `GameSystem` (`schema` JSONB, `authorId` NOT NULL) |
| `20261004170522_wiki_folders_versions` | dossiers et versions de wiki                                           |
| `20261004202736_add_template_category` | catégorie de modèle                                                    |
| `20261005093047_phase6_chat_scene`     | chat et scène                                                          |
| `20261005124741_phase8_combat`         | état de combat                                                         |
| `20261005130213_phase8_journal`        | journal                                                                |
| `20261015214736_phase8_ambiance`       | playlists d'ambiance                                                   |
| `20261016135142_phase10_permissions`   | grants de permissions                                                  |
| `20261031114205_api_keys`              | clés d'API                                                             |
| `20261031150000_wiki_gm_only`          | `Entity.gmOnly` uniquement (2 lignes)                                  |

### Dérive entre migrations et schéma

Les objets suivants existent dans `schema.prisma` mais dans **aucune** migration :

- `Campaign.description`, `Campaign.visibility`, `Campaign.gameSystemId` ;
- `JsonTemplate.customCss` ;
- `EntityAssignee` (table d'assignation des fiches) et ses relations ;
- refonte de `GameSystem` (champs et nullabilité différents de `add_game_system`) ;
- `Novel.genre`, `Novel.tags`, `Novel.shareToken`, `Novel.shareMode` ;
- `NovelCollaborator` et relations utilisateur associées.

Conséquence : `pnpm db:migrate` sur une base vierge produit un schéma incomplet,
et la base Neon actuelle n'a pas d'historique de migrations baseline (elle est
maintenue par `pnpm db:push`).

### Plan de baseline retenu (non exécuté sur Neon)

1. Générer une migration **additive** `20261101090000_schema_0_6_0` contenant le
   diff entre l'état des 12 migrations et `schema.prisma`.
2. Valider sur un PostgreSQL jetable : rejouer les 13 migrations sur une base
   vierge, puis exiger un `prisma migrate diff` **vide** (zéro drift).
3. Documenter la procédure Neon : vérifier que les objets existent déjà, puis
   `prisma migrate resolve --applied 20261101090000_schema_0_6_0` — sans
   exécuter de DDL. Une sauvegarde Neon est recommandée avant toute bascule.
4. Ne jamais lancer `db:push`, `migrate reset` ou une suppression de colonne sur
   Neon sans approbation écrite et SQL affiché.

Procédure détaillée et rollback : `docs/deployment.md`.

## 2. Matrice des modules (état réel au 0.6.0)

| Module             | Statut               | Ce qui marche                                                                                    | Écart avec la promesse                                                                                         |
| ------------------ | -------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Table / VTT        | Fonctionnel          | scène Pixi, murs typés, vision, jetons liés aux fiches, sorts, dés serveur, E2E deux navigateurs | une seule scène par campagne (pas de liste) ; le payload RSC initial livrait la scène brute (corrigé en 0.6.1) |
| Wiki               | Fonctionnel          | TipTap, blocs, modèles, versions (5 min / 50), partage public `noindex`                          | historique par instantanés, pas par sauvegarde                                                                 |
| Graphe             | Fonctionnel          | zoom/pan, liens, création/suppression MJ                                                         | E2E limité au chargement                                                                                       |
| Journal            | Fonctionnel          | CRUD de handouts, filtres MJ/joueur                                                              | **aucune automatisation table → journal** ; la landing le promettait                                           |
| Choix              | Fonctionnel          | création MJ, vote joueur, résolution                                                             | « temps réel » = refetch RSC, pas de payload poussé                                                            |
| Ambiance           | Partiel              | playlists, import local, transport synchronisé                                                   | pas de position/seek partagée : les retardataires démarrent à 0                                                |
| Combat             | Fonctionnel          | initiative, tours, diffusion MJ → joueurs                                                        | état + initiative, pas de moteur de règles                                                                     |
| Fiches             | Fonctionnel          | modèles 12 colonnes, assignation, édition contrôlée                                              | E2E sans assignation multi-joueurs                                                                             |
| Macros             | Partiel              | éditeur, exécution en iframe sandbox                                                             | stockage `localStorage` uniquement : pas de partage ni de persistance serveur                                  |
| Réglages           | Fonctionnel          | thème, CSS sanitisé, 5 plugins                                                                   | JS personnalisé stocké mais jamais exécuté hors aperçu                                                         |
| Permissions        | Partiel              | rôles MJ/PJ, dernier MJ protégé, grants de vue                                                   | grants limités à `vtt/wiki/graph/journal/choices/ambiance`                                                     |
| Romans             | Fonctionnel          | chapitres, autosave, impression, partage lecture/relecture/édition                               | partage et impression non couverts par l'E2E                                                                   |
| Bibliothèque       | Fonctionnel          | romans publiés, recherche auteur/genre/tag                                                       | pas d'E2E dédié                                                                                                |
| Builder de modèles | Fonctionnel          | grille, champs, CSS sanitisé, import/export JSON                                                 | pas d'export de campagne                                                                                       |
| Systèmes de jeu    | Fonctionnel (limité) | 7 presets, systèmes maison, génération d'un modèle Personnage                                    | pas de moteur de règles                                                                                        |
| Export / Import    | **Absent**           | schéma partagé + tests du builder uniquement                                                     | `jszip` installé mais inutilisé ; aucune action ni UI                                                          |

Bilan : 12 modules fonctionnels, 3 partiels (Ambiance, Macros, Permissions),
1 absent (Export/Import).

## 3. Cartographie des autorisations

### Pages campagne

Toutes les pages `campaign/[id]/**` exigent une session (sinon `/login`) et une
adhésion (sinon 404). Les modules à grant (`vtt`, `wiki`, `graph`, `journal`,
`choices`, `ambiance`) renvoient 404 si `permissions.view[module] === false`.
`settings` est lisible par tout membre mais la clé d'invitation n'est rendue
qu'au MJ ; `permissions` est réservé au MJ.

### Pages publiques

| Surface                    | Anonyme       | Contrôle                                                        |
| -------------------------- | ------------- | --------------------------------------------------------------- |
| `/`, `/login`, `/register` | oui           | —                                                               |
| `/library`                 | oui           | romans `published` uniquement                                   |
| `/novels/[id]`             | oui si publié | `canReadNovel` ; chapitres publiés seuls sans rôle              |
| `/shared/[slug]`           | oui           | slug aléatoire, `gmOnly` refusé, secrets retirés, HTML sanitisé |
| `/shared/novel/[token]`    | oui           | token + `shareMode` ; `read` filtre les chapitres publiés       |

### Server Actions

Toutes les mutations de campagne sont réservées au MJ, sauf :

- `castVote` (joueur membre, grant `choices` vérifié) ;
- `saveTokenCombat` (propriétaire d'un jeton lié) — **grant `vtt` absent au 0.6.0** ;
- `saveTemplateData` (joueur assigné à une fiche non `gmOnly`) — **grant absent au 0.6.0** ;
- `saveTemplateAsSystemPreset` (tout membre) — **réservé au MJ en 0.6.1** ;
- `listWikiVersions` (tout membre) — **fuyait les métadonnées d'entités invisibles, corrigé en 0.6.1** ;
- `createApiKey`/`revokeApiKey` (propriétaire) — **aucun guard ne consomme ces clés**.

Romans : `updateNovel`, `deleteChapter`, `setNovelShare` et le statut de chapitre
sont réservés à l'auteur ; l'éditeur peut créer, renommer, réordonner et
sauvegarder le contenu.

### WebSocket

Tous les événements sont authentifiés à la connexion (session Better Auth
validée en base). Contrôles constatés au 0.6.0 :

| Événement                    | Émetteur autorisé           | Contrôle                                              | Problème au 0.6.0                                                     |
| ---------------------------- | --------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `campaign:join`              | membre                      | adhésion DB                                           | —                                                                     |
| `chat:send`                  | membre                      | adhésion, 5/s                                         | grant non vérifié                                                     |
| `choices:update`             | membre                      | adhésion                                              | invalidation seule                                                    |
| `ambiance:state`             | MJ                          | `gmOnly`                                              | —                                                                     |
| `ambiance:playlists-changed` | membre                      | adhésion                                              | invalidation seule                                                    |
| `token:move`                 | propriétaire du jeton       | propriété, 30/s                                       | **positions de tous les jetons diffusées**                            |
| `plugin:event`               | MJ                          | `gmOnly` + plugin actif                               | —                                                                     |
| `scene:commit`               | membre, restrictions joueur | MJ complet ; joueur limité PV/CA/vision de ses jetons | **état brut rediffusé à toute la room**                               |
| `scene:activate`             | MJ                          | `gmOnly`                                              | —                                                                     |
| `fiche:sync`                 | membre                      | `gmOnly` seulement                                    | **aucune vérification d'assignation ; patch diffusé à toute la room** |
| `dice:roll`                  | membre                      | adhésion, 5/s ; macros `gmOnly` filtrées              | **valeurs de fiches assignées à d'autres utilisées dans les macros**  |

Aucun événement anonyme. Les grants de module ne sont **pas** appliqués côté
WebSocket au 0.6.0 : un joueur dont le module est masqué peut encore se
connecter et émettre/recevoir les événements correspondants.

## 4. Risques techniques

### WebSocket sur Vercel

Les WebSockets persistants sont supportés par Vercel Functions (GA depuis le
2026-10-20) et `vercel.json` route bien `/socket.io/*` vers le service Nest.
Contraintes structurantes :

- connexion épinglée à une instance : pas de fan-out entre instances sans
  adaptateur externe (Redis) ; aucun adaptateur n'est installé ;
- coupure à la durée maximale de la fonction (300 s Hobby, 800 s Pro) ;
- Socket.IO doit rester en `transports: ["websocket"]` — c'est déjà le cas ;
- l'upgrade WebSocket du preset NestJS sur Vercel n'est pas documenté
  explicitement : à valider par un déploiement réel.

Conséquence : la table fonctionne pour un usage mono-instance, mais un
déploiement multi-instances perd la synchronisation temps réel. Alternatives :
serveur long-running hors Vercel, service pub/sub managé, ou adaptateur Redis
(qui ne règle pas la coupure de durée).

### Rate limiting

- Nest : 100 req/60 s par IP (`@nestjs/throttler`), global, sans surcharge.
- `/api/auth/*` : 100 req/60 s/IP en mémoire de process (`proxy.ts`) — non
  partagé entre instances, remis à zéro au cold start, pas de quota spécifique
  au sign-in.
- WebSocket : quotas par socket (chat 5/s, dé 5/s, jeton 30/s), testés.
- Aucun test du rate-limit HTTP.

### Bundle

Aucun `next/dynamic` ni `React.lazy` dans `apps/web/src`. PixiJS est importé
statiquement par la route VTT ; TipTap par les routes d'édition. Les pages
publiques de roman n'importent que le type `JSONContent` de TipTap, donc pas
l'éditeur. Aucune mesure de chunk de production n'a été faite.

### Tests

64 fichiers de test (~532 cas) : 55 unitaires/intégration + 9 specs Playwright
(22 scénarios). Points faibles :

- auth du handshake WebSocket non testée ;
- `plugin:event`, `resolveMacros`, création/suppression de liens de graphe et
  vote refusé sans grant non couverts ;
- partage de roman, clés d'API et pages publiques non couverts ;
- E2E existants limités aux parcours nominaux.

## 5. Couverture des correctifs de sécurité 0.6.0

| Correctif annoncé                                   | Testé   | Constat                                                                             |
| --------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| Filtrage notes MJ + quotas WS                       | Partiel | gateway (26 tests) et helpers purs ; handshake et hydratation initiale non couverts |
| Liens `http(s)`/`mailto`/relatifs, CSS sanitisé     | Oui     | `sanitize-wiki`, `tiptap-content`, `sanitizeCss`                                    |
| Persistance scène MJ / `scene:commit` joueur limité | Oui     | 8 tests de commit joueur + visibilité                                               |
| Graphe MJ-only                                      | Non     | seule la mise en page est testée                                                    |
| Vote refusé sans module                             | Non     | le dépouillement est testé, pas le garde                                            |
| `plugin:event` MJ-only, macros `gmOnly`             | Non     | aucun test                                                                          |
| Jetons verrouillés côté joueur                      | Oui     | gateway + `fiches/access`                                                           |
| Romans auteur-only                                  | Partiel | lecture testée, mutations non                                                       |

## 6. Contradictions documentaires

| Source                                                      | Affirmation                                                | Réalité                                                      | Correction                     |
| ----------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| `landing/community.tsx`                                     | « Open source à venir »                                    | dépôt public MIT                                             | « Open source · MIT »          |
| `landing/features.tsx`, `community.tsx`, `pricing-note.tsx` | données « exportables à tout moment »                      | seuls modèles, thèmes et systèmes s'exportent                | texte limité aux exports réels |
| `landing/features.tsx`                                      | la table « se journalise »                                 | journal 100 % manuel                                         | « handouts manuels »           |
| `landing/features.tsx`                                      | « Six modules »                                            | 11 modules                                                   | 11 modules                     |
| `landing/features.tsx`, `ROADMAP.md`                        | mode « Théâtre »                                           | retiré (notes de théâtre toujours vides)                     | retiré des promesses           |
| `ROADMAP.md`                                                | « Local-first », pas de cloud                              | déploiement Vercel livré                                     | retiré                         |
| `ROADMAP.md`                                                | dés 3D, export ZIP, `packages/config`, `/builder`, `docs/` | absents                                                      | retirés                        |
| `ROADMAP.md`                                                | statuts ✅ et chiffres de tests                            | obsolètes depuis v0.1.1                                      | réécrite sur l'état vérifié    |
| `CHANGELOG.md`                                              | 0.6.0 « à venir », « commit prévu »                        | commit `fcd2ff5` existe                                      | entrée datée                   |
| `CHANGELOG.md`                                              | « générer les migrations avant le commit »                 | commit déjà fait                                             | voir §1                        |
| `CHANGELOG.md`                                              | « un éditeur ne peut modifier que le contenu »             | il crée/renomme/réordonne aussi                              | reformulé                      |
| `README.md`                                                 | ESLint partout, typecheck partout, Nest en watch           | oxlint côté serveur, pas de typecheck database, `nest start` | corrigé                        |
| `README.md`                                                 | macros « sans eval »                                       | `new Function` confiné dans une iframe sandbox               | formulé précisément            |
| `README.md`                                                 | tous les modules activables                                | 5 plugins uniquement                                         | précisé                        |
| `apps/server/package.json`                                  | `UNLICENSED`                                               | projet MIT                                                   | aligné                         |

## 7. Conclusion

L'architecture est cohérente et les mutations sont majoritairement protégées.
Les risques dominants au 0.6.0 étaient : le payload RSC initial du VTT contenant
la scène brute, l'absence de grants sur la couche WebSocket, et la diffusion
`fiche:sync`/`fiche:combat` de fiches secrètes. Les correctifs correspondants
sont déployés en 0.6.1 (voir `CHANGELOG.md`), avec tests unitaires.

Restent ouverts après cette phase : grants WebSocket, adaptateur Redis si
multi-instances, export de campagne, automatisation du journal, et la
vérification réelle du déploiement NestJS/WebSocket sur Vercel.
