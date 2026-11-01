# ROADMAP — Aetheris

> **Plateforme VTT & Lore Studio**
> Version documentée : 0.6.1 · Dernière mise à jour : 2026-11-01.
> Source de vérité : le code au commit `e5cdff4` (`e5cdff4074445cc982818ae5f0e04a4dd45fa509`,
> `PATCH: aetheris - v0.6.1`, 2026-11-01).
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

## État réel vérifié en v0.6.1

Périmètre : 11 modules de campagne + 4 surfaces produit = **15 entrées**.

| #   | Module          | Statut               | Preuve et limite                                                                                                                                                                                                                                                |
| --- | --------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Table / VTT     | Fonctionnel          | `features/vtt`, gateway `token:*` / `scene:*` ; une seule scène par campagne, pas de liste de scènes.                                                                                                                                                           |
| 2   | Wiki            | Fonctionnel          | Routes `/wiki` et `/wiki/templates`, TipTap, blocs, versions, partage public ; l'éditeur de modèles est un sous-module du Wiki.                                                                                                                                 |
| 3   | Graphe          | Fonctionnel          | Route `/graph`, liens `EntityLink`, zoom/pan ; E2E limité au chargement.                                                                                                                                                                                        |
| 4   | Journal         | Fonctionnel          | Route `/journal`, CRUD manuel de handouts (`features/journal/actions.ts`) ; **aucune automatisation table → journal**.                                                                                                                                          |
| 5   | Choix           | Fonctionnel          | Route `/choices`, création MJ et vote joueur ; la mise à jour passe par un refetch RSC, pas par un payload poussé.                                                                                                                                              |
| 6   | Ambiance        | Partiel              | Playlists en base et transport synchronisé (`ambiance:state`) ; pas de position/seek partagée, un retardataire démarre la piste à 0.                                                                                                                            |
| 7   | Combat          | Fonctionnel          | Route `/combat`, initiative, tours et diffusion MJ → joueurs ; pas de moteur de règles.                                                                                                                                                                         |
| 8   | Fiches          | Fonctionnel          | Route `/fiches`, modèles 12 colonnes, assignation, édition contrôlée par rôle.                                                                                                                                                                                  |
| 9   | Macros          | Partiel              | Éditeur et exécution en iframe sandbox ; stockage `localStorage` par campagne, pas de persistance serveur ni de partage.                                                                                                                                        |
| 10  | Réglages        | Fonctionnel          | Route `/settings`, thème CSS sanitisé, bascules des 5 plugins ; le JS de thème n'est exécuté qu'en aperçu sandboxé.                                                                                                                                             |
| 11  | Permissions     | Partiel              | Rôles MJ/PJ, dernier MJ protégé, grants `view` ; grants limités à `vtt/wiki/graph/journal/choices/ambiance`. Depuis 0.6.1, les événements WebSocket contrôlent l'assignation et la propriété (jetons, fiches), mais les grants n'y sont toujours pas appliqués. |
| 12  | Romans          | Fonctionnel          | Routes `/novels`, autosave, statuts, impression, partage lecture/relecture/édition ; partage et impression non couverts par l'E2E.                                                                                                                              |
| 13  | Bibliothèque    | Fonctionnel          | Route `/library`, romans publiés, recherche auteur/genre/tag ; pas d'E2E dédié.                                                                                                                                                                                 |
| 14  | Systèmes de jeu | Fonctionnel (limité) | 7 presets et systèmes maison via l'assistant de création de campagne ; génère un modèle Personnage, pas de moteur de règles.                                                                                                                                    |
| 15  | Export / Import | **Absent**           | Schéma `campaignExportSchema` et tests uniquement ; `jszip` installé mais inutilisé, aucune action ni UI.                                                                                                                                                       |

**Bilan : 11 modules fonctionnels, 3 partiels (Ambiance, Macros, Permissions), 1 absent
(Export/Import).** En comptant l'éditeur de modèles comme une surface distincte — ce que
fait l'audit 0.6.0 (`docs/audit-0.6.0.md`) — cela donne 12 surfaces fonctionnelles ; rattaché au Wiki,
il ramène la matrice à 15 entrées et 11 modules fonctionnels. Les exports réellement
livrés sont limités aux **modèles, thèmes et systèmes de jeu en JSON** — pas de campagne
ni de compte.

Contrôles effectués le 2026-11-01 : `pnpm typecheck` passe sur les 5 workspaces ;
`pnpm exec turbo lint` passe (serveur : 0 erreur ; web : 0 erreur, 4 warnings préexistants).

---

## Décisions d'architecture

### Retenu

- **Monorepo pnpm + Turborepo** : `apps/web` (Next.js 16 App Router, React 19),
  `apps/server` (NestJS 12 + Socket.io), `packages/database` (Prisma), `packages/shared`
  (contrats Zod), `packages/plugin-api`.
- **Next.js pour les pages et Server Actions** ; **NestJS pour le temps réel** et le
  relais des événements de campagne.
- **Prisma + Neon (PostgreSQL)**. Une migration additive de baseline
  (`20261101090000_schema_0_6_0`) est générée et la procédure de baseline est documentée
  dans `docs/deployment.md`. La baseline n'est pas encore exécutée sur Neon : tant qu'elle
  ne l'est pas, `pnpm db:push` reste la méthode d'exploitation de la base Neon.
- **Better Auth** : e-mail/mot de passe, sessions, OAuth Discord/GitHub activé par variables
  d'environnement.
- **Contrats partagés** : les payloads HTTP/WS, formules, systèmes de jeu et schémas sont
  définis dans `packages/shared` et consommés par les deux apps.
- **Plugins par campagne** : `PLUGIN_CATALOG` expose 5 modules (`combat`, `journal`,
  `ambiance`, `fiches`, `macros`) ; le cœur n'est pas désactivable.
- **Sandbox** : CSS sanitisé, JS exécuté dans une iframe `sandbox="allow-scripts"` sans
  origine, via `new Function` confiné — aucun `eval` dans le document parent.
- **Déploiement Vercel Services** (`vercel.json`) : service Nest et service Next, rewrites
  `/api/auth`, `/api` et `/socket.io`. WebSocket supporté en mono-instance ; aucun adaptateur
  Redis n'est installé.
- **Documentation versionnée** : `docs/audit-0.6.0.md` (audit 0.6.0) et
  `docs/deployment.md` (migrations, baseline Neon) sont versionnés avec le code.

### Abandonné ou non livré

- **Mode Théâtre / Theatre of the Mind** : retiré ; `theatreNotes` est toujours vide
  (`features/vtt/socket.ts`).
- **Dés 3D** : abandonnés ; les jets sont calculés côté serveur, sans physique ni rendu 3D.
- **Local-first** : abandonné ; l'application est déployée sur Vercel et la base est sur Neon.
- **Export/import ZIP de campagne** : schéma et tests seulement, aucune action ni UI.
- **`packages/config`** : n'existe pas ; les configurations vivent dans chaque workspace.
- **Route `/builder`** : n'existe pas ; les modèles sont dans `/wiki/templates`, les macros
  dans `/campaign/[id]/macros`, les systèmes de jeu dans l'assistant de création.
- **Route `/campaign/[id]/chat`** : n'existe pas ; le chat et les dés vivent dans la VTT.
- **Journal automatique** : non implémenté ; le journal est un CRUD manuel.
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

---

## Prochaines étapes réalistes

Candidats, non planifiés et non promis :

1. **Export/import de campagne** : brancher une action et une UI sur `campaignExportSchema` ;
   trancher JSON vs ZIP (jszip est déjà installé).
2. **Ambiance** : partager la position de lecture et rattraper les clients retardataires.
3. **Macros** : persister les macros côté serveur et les partager dans la campagne.
4. **Permissions** : appliquer les grants aux événements WebSocket et documenter la limite
   des grants au niveau module.
5. **Migrations** : valider la migration `20261101090000_schema_0_6_0` sur un PostgreSQL
   jetable, puis exécuter la procédure de baseline sur Neon (`docs/deployment.md`) sans DDL ;
   garder `db:push` en attendant.
6. **Journal** : assumer le CRUD manuel dans la documentation ou implémenter une
   automatisation table → journal.
7. **Temps réel multi-instances** : adaptateur Redis ou hébergement long-running si le
   déploiement doit dépasser une instance.
8. **Tests** : handshake WebSocket, événements de plugins, export de campagne.
9. **Documentation** : maintenir `docs/audit-0.6.0.md` et `docs/deployment.md` à jour ;
   garder README, ROADMAP, landing et CHANGELOG alignés à chaque version.

---

_Règle : un module n'est « fonctionnel » que si son parcours principal est présent dans le
code et que ses limites connues sont documentées. Une fonctionnalité absente n'apparaît pas
comme une promesse._
