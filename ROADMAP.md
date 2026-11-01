# ROADMAP — Aetheris

> **Plateforme VTT & Lore Studio**
> Version documentée : 0.7.5 · Dernière mise à jour : 2026-11-01.
> Base vérifiée : commit `2ca775e` (v0.7.4), complétée par `UPDATE: aetheris - v0.7.5`.
> Chaque statut ci-dessous est vérifié dans le code ; aucune case n'est cochée sans preuve.

---

## Vision

Une application web pour mener une campagne de jeu de rôle de bout en bout :

- **Base de connaissances** : notes liées en `[[double crochets]]`, backlinks, graphe, versions.
- **Table virtuelle** : scènes PixiJS, jetons, murs, vision et brouillard de guerre.
- **Gestion de campagne** : fiches issues de modèles, systèmes de jeu, combat, journal, ambiance.
- **Studio d'écriture** : romans et chapitres, autosave, statuts, impression et partage.

Le cœur (table, wiki, graphe, choix, réglages, permissions) reste fixe. Cinq modules
étendus s'activent ou se désactivent par campagne : Combat, Journal, Ambiance, Fiches
et Macros.

---

## État réel vérifié en v0.7.5

Périmètre : 11 modules de campagne + 4 surfaces produit = **15 entrées**.

| #   | Module                 | Statut               | Preuve et limite                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Table / VTT            | Fonctionnel          | `features/vtt`, gateway `token:*` / `scene:*` ; une seule scène par campagne, pas de liste de scènes. Depuis 0.7.2–0.7.5 : images de jetons (`imageUrl`), sources lumineuses, 14 états et annuler/rétablir MJ (30 entrées en mémoire).                                                                                            |
| 2   | Wiki                   | Fonctionnel          | Routes `/wiki` et `/wiki/templates`, TipTap, blocs, versions, partage public ; l'éditeur de modèles est un sous-module du Wiki.                                                                                                                                                                                                   |
| 3   | Graphe                 | Fonctionnel          | Route `/graph`, liens `EntityLink`, zoom/pan ; E2E limité au chargement.                                                                                                                                                                                                                                                          |
| 4   | Journal                | Fonctionnel          | Route `/journal`, CRUD de handouts et `JournalAutomationService` (0.7.1) : jets, arrivées, activation de scène et événements de plugins alimentent le journal si le module est actif. Anti-flood d'une entrée par campagne et par seconde, en mémoire.                                                                            |
| 5   | Choix                  | Fonctionnel          | Route `/choices`, création MJ et vote joueur ; la mise à jour passe par un refetch RSC, pas par un payload poussé.                                                                                                                                                                                                                |
| 6   | Ambiance               | Partiel              | Playlists en base et transport synchronisé (`ambiance:state`) ; pas de position/seek partagée, un retardataire démarre la piste à 0.                                                                                                                                                                                              |
| 7   | Combat                 | Fonctionnel          | Route `/combat`, initiative, tours et diffusion MJ → joueurs ; pas de moteur de règles.                                                                                                                                                                                                                                           |
| 8   | Fiches                 | Fonctionnel          | Route `/fiches`, modèles 12 colonnes, assignation, édition contrôlée par rôle.                                                                                                                                                                                                                                                    |
| 9   | Macros                 | Partiel              | Éditeur et exécution en iframe sandbox ; stockage `localStorage` par campagne, pas de persistance serveur ni de partage.                                                                                                                                                                                                          |
| 10  | Réglages               | Fonctionnel          | Route `/settings`, thème CSS sanitisé, bascules des 5 plugins ; le JS de thème n'est exécuté qu'en aperçu sandboxé.                                                                                                                                                                                                               |
| 11  | Permissions            | Partiel              | Rôles MJ/PJ, dernier MJ protégé, grants `view` ; grants limités à `vtt/wiki/graph/journal/choices/ambiance`. Depuis 0.6.1, les événements WebSocket contrôlent l'assignation et la propriété (jetons, fiches), mais les grants n'y sont toujours pas appliqués.                                                                   |
| 12  | Romans                 | Fonctionnel          | Routes `/novels`, autosave, statuts, impression, partage lecture/relecture/édition ; partage et impression non couverts par l'E2E.                                                                                                                                                                                                |
| 13  | Bibliothèque           | Fonctionnel          | Route `/library`, romans publiés, recherche auteur/genre/tag ; pas d'E2E dédié.                                                                                                                                                                                                                                                   |
| 14  | Systèmes de jeu        | Fonctionnel (limité) | 7 presets et systèmes maison via l'assistant de création de campagne ; génère un modèle Personnage, pas de moteur de règles.                                                                                                                                                                                                      |
| 15  | Export auteur / Import | Partiel (assumé)     | `GET /novels/export` livre un ZIP JSON des romans dont l'utilisateur est l'auteur (200 maximum, document TipTap brut et texte extrait), filtré strictement sur `authorId` et documenté dans `docs/export.md`. L'export de campagne reste absent : `campaignExportSchema` et tests seulement, aucune action ni UI d'import/export. |

**Bilan : 11 modules fonctionnels, 4 partiels (Ambiance, Macros, Permissions,
Export auteur/Import), 0 absent.** En comptant l'éditeur de modèles comme une surface
distincte — ce que fait l'audit 0.6.0 (`docs/audit-0.6.0.md`) — cela donne 12 surfaces
fonctionnelles ; rattaché au Wiki, il ramène la matrice à 15 entrées et 11 modules
fonctionnels. Les exports réellement livrés sont les **modèles, thèmes et systèmes de jeu
en JSON**, plus l'**archive auteur des romans en ZIP JSON** ; il n'existe ni export ni
import de campagne, ni export de compte.

Contrôles effectués le 2026-11-01 : `pnpm typecheck` passe sur les 5 workspaces ;
`pnpm exec turbo lint` passe (serveur : 0 erreur ; web : 0 erreur, 4 warnings préexistants) ;
`pnpm test` passe (shared 140, web 376, serveur 59) et `pnpm test:e2e` passe (29/29 sur
serveurs de dev actifs) le 2026-11-01. `pnpm fmt:check` est vert sur 446 fichiers.

---

## Décisions d'architecture

### Retenu

- **Monorepo pnpm + Turborepo** : `apps/web` (Next.js 16 App Router, React 19),
  `apps/server` (NestJS 12 + Socket.io), `packages/database` (Prisma), `packages/shared`
  (contrats Zod), `packages/plugin-api`.
- **Next.js pour les pages et Server Actions** ; **NestJS pour le temps réel** et le
  relais des événements de campagne.
- **Prisma + Neon (PostgreSQL)**. La migration additive de baseline
  `20261101090000_schema_0_6_0` est générée et validée sur PostgreSQL 17 ; la procédure
  `migrate resolve --applied` est documentée dans `docs/deployment.md`. **La base Neon
  n'a pas d'historique de migrations baseline** : `pnpm db:push` reste donc la méthode
  d'exploitation, en écart assumé avec la règle « pas de `db:push` en production » de
  `docs/deployment.md`, tant que la procédure de baseline n'a pas été exécutée.
- **Better Auth** : e-mail/mot de passe, sessions, OAuth Discord/GitHub activé par variables
  d'environnement.
- **Contrats partagés** : les payloads HTTP/WS, formules, systèmes de jeu et schémas sont
  définis dans `packages/shared` et consommés par les deux apps.
- **Plugins par campagne** : `PLUGIN_CATALOG` expose 5 modules (`combat`, `journal`,
  `ambiance`, `fiches`, `macros`) ; le cœur n'est pas désactivable.
- **Sandbox** : CSS sanitisé, JS exécuté dans une iframe `sandbox="allow-scripts"` sans
  origine, via `new Function` confiné — aucun `eval` dans le document parent.
- **Stockage d'images** : Vercel Blob via `POST /api/uploads`, session obligatoire,
  validation des magic bytes (PNG, JPEG, WebP, GIF ; SVG refusé), 8 Mo par fichier et
  quota de 200 Mo / 500 fichiers par utilisateur ; le chemin serveur est reconstruit.
  Décision, coûts et sécurité dans `docs/storage.md`.
- **Journal automatique serveur** : `JournalAutomationService` écoute `dice.rolled`,
  `campaign.joined`, `scene.activated` et `plugin.event`. L'anti-flood (une écriture par
  campagne et par seconde) est un `Map` en mémoire : il ne protège qu'une **instance**,
  à déplacer dans un store partagé si le serveur est répliqué.
- **Annuler/rétablir VTT** : historique en mémoire côté client (`features/vtt/history.ts`,
  `use-vtt-history.ts`), plafonné à 30 instantanés, avec regroupement des rafales sur
  400 ms. Raccourcis `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl/Cmd+Y` et boutons dédiés,
  réservés au MJ. Rien n'est persisté séparément : la restauration passe par les setters
  et le commit débouncé existants, et l'historique est perdu au rechargement.
- **Lumière et vision séparées** : une source lumineuse éclaire la carte (polygone
  découpé par les murs, portée en cases) mais ne révèle pas la silhouette des jetons hors
  vision ; seuls les jetons possédés ou déjà visibles projettent leur lumière.
- **Déploiement Vercel Services** (`vercel.json`) : service Nest et service Next, rewrites
  `/api/auth`, `/api/uploads`, `/api` et `/socket.io`. WebSocket supporté en mono-instance ;
  aucun adaptateur Redis n'est installé.
- **Documentation versionnée** : `docs/audit-0.6.0.md` (audit 0.6.0), `docs/deployment.md`
  (migrations, baseline Neon), `docs/storage.md` (Vercel Blob) et `docs/export.md`
  (périmètre des exports) sont versionnés avec le code.

### Abandonné ou non livré

- **Mode Théâtre / Theatre of the Mind** : retiré ; `theatreNotes` est toujours vide
  (`features/vtt/socket.ts`).
- **Dés 3D** : abandonnés ; les jets sont calculés côté serveur, sans physique ni rendu 3D.
- **Local-first** : abandonné ; l'application est déployée sur Vercel et la base est sur Neon.
- **Export/import de campagne** : schéma `campaignExportSchema` et tests seulement, aucune
  action ni UI. L'export auteur de romans est livré, mais il ne couvre pas la campagne.
- **`packages/config`** : n'existe pas ; les configurations vivent dans chaque workspace.
- **Route `/builder`** : n'existe pas ; les modèles sont dans `/wiki/templates`, les macros
  dans `/campaign/[id]/macros`, les systèmes de jeu dans l'assistant de création.
- **Route `/campaign/[id]/chat`** : n'existe pas ; le chat et les dés vivent dans la VTT.
- **Tous les modules activables** : faux ; seuls les 5 plugins du catalogue le sont.

---

## Historique condensé

- **0.1.0 — 2026-10-04** : commit initial.
- **0.1.1 — 2026-10-04** : checkpoint avant refonte du frontend.
- **0.2.0 — 2026-10-19** : frontend reconstruit (wiki TipTap, graphe, choix, VTT), puis
  modules Combat, Fiches, Macros, Réglages, Permissions et Ambiance ; numéro réutilisé après
  la refonte (un 0.2.0 pré-refonte du 2026-10-04 existe dans l'historique).
- **0.3.0 — 2026-10-19** : navigation à 11 modules et studio d'écriture enrichi.
- **0.3.1 — 2026-10-19** : correctif WebSocket (`connect_error`).
- **0.4.0 — 2026-10-19** : TopNav unique fusionnant navigation globale et modules ; suppression
  des routes modales de campagne.
- **0.5.0 — 2026-10-20** : fiches par catégories, filtres du journal, desktop pleine largeur,
  ajustements mobile.
- **0.5.1 — 2026-10-31** : déploiement Vercel et durcissement Nest (helmet, throttler, CORS).
- **0.5.2 — 2026-10-31** : correctifs de build Vercel (client Prisma, `globalEnv` Turbo).
- **0.5.3 — 2026-10-31** : `middleware.ts` renommé en `proxy.ts` pour Next 16.
- **0.5.4 — 2026-10-31** : VTT (navbar, fenêtres, `?embed=1`), refonte du wiki, choix, combat,
  journal et romans.
- **0.6.0 — 2026-10-31** : murs typés, vision par jeton, sorts et jetons liés aux fiches,
  notes MJ secrètes, éditeur de modèles 12 colonnes, systèmes de jeu, partage de romans,
  bibliothèque publique et durcissement WebSocket.
- **0.6.1 — 2026-11-01** : filtrage serveur de la scène VTT et des fiches visibles, contrôles
  d'assignation/propriété sur les événements WebSocket, grants sur les Server Actions,
  rotation du token de partage des romans et navigation publique corrigée.
- **0.6.2 — 2026-11-01** : ROADMAP réécrite sur l'état vérifié, README et landing alignés,
  entrée CHANGELOG 0.6.1 datée.
- **0.6.3 — 2026-11-01** : migration additive de baseline `20261101090000_schema_0_6_0`
  validée sur PostgreSQL 17 (13 migrations, zéro drift) ; procédure Neon documentée sans
  exécution.
- **0.6.4 — 2026-11-01** : correctif de sélection des modèles de fiches, E2E 27/27 et CI
  `check` + `e2e`.
- **0.7.0 — 2026-11-01** : uploads Vercel Blob sécurisés, campagne de démonstration avec
  rollback, export auteur ZIP, guide MJ `/aide`, documentation storage/export.
- **0.7.1 — 2026-11-01** : journal automatique serveur (`@nestjs/event-emitter`) pour les
  jets, arrivées, scènes et événements de plugins, avec anti-flood.
- **0.7.2 — 2026-11-01** : jetons illustrés par image distante (`imageUrl`), champ verrouillé
  pour les joueurs.
- **0.7.3 — 2026-11-01** : sources lumineuses par jeton découpées par les murs, redessin
  immédiat du brouillard.
- **0.7.4 — 2026-11-01** : 14 états de jetons avec pastilles, édition MJ et verrouillage
  joueur.
- **0.7.5 — 2026-11-01** : annuler/rétablir les actions de scène du MJ (30 entrées en
  mémoire, raccourcis et boutons de barre d'outils).

---

## Prochaines étapes réalistes

Candidats, non planifiés et non promis :

1. **Export/import de campagne** : brancher `campaignExportSchema` sur une Server Action et
   une UI, trancher JSON vs ZIP (`jszip` est déjà utilisé par l'export auteur) et créer une
   nouvelle campagne à l'import.
2. **Ambiance** : partager la position de lecture et rattraper les clients retardataires.
3. **Macros** : persister les macros côté serveur et les partager dans la campagne.
4. **Permissions** : appliquer les grants aux événements WebSocket et documenter la limite
   des grants au niveau module.
5. **Migrations** : exécuter la procédure de baseline sur Neon (`docs/deployment.md`) sans
   DDL, puis retirer `db:push` de l'exploitation courante.
6. **Journal** : déplacer l'anti-flood dans un store partagé avant tout déploiement
   multi-instances.
7. **Historique VTT** : décider s'il faut étendre l'annulation aux actions hors scène ou
   conserver l'historique entre rechargements ; aujourd'hui il est en mémoire et limité à la
   session du MJ.
8. **Temps réel multi-instances** : adaptateur Redis ou hébergement long-running si le
   déploiement doit dépasser une instance.
9. **Tests** : handshake WebSocket, événements de plugins, export/import de campagne et
   parcours E2E de l'historique VTT.
10. **Documentation** : maintenir `docs/audit-0.6.0.md`, `docs/deployment.md`,
    `docs/storage.md` et `docs/export.md` ; garder README, ROADMAP, landing et CHANGELOG
    alignés à chaque version.

---

_Règle : un module n'est « fonctionnel » que si son parcours principal est présent dans le
code et que ses limites connues sont documentées. Une fonctionnalité absente n'apparaît pas
comme une promesse._
