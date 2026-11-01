# Aetheris

> **Plateforme VTT & Lore Studio tout-en-un** — table virtuelle, base de connaissances façon Obsidian et studio d'écriture de romans, réunis dans une seule app.

[![Version](https://img.shields.io/badge/version-0.7.2-8b5cf6)](./CHANGELOG.md)
[![Licence](https://img.shields.io/badge/licence-MIT-111)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/)

Aetheris sert à mener une campagne de jeu de rôle de bout en bout : préparer le lore,
jouer autour d'une table virtuelle synchronisée en temps réel, gérer les fiches et le
combat, puis raconter l'histoire dans un studio d'écriture intégré. Chaque campagne
active ou désactive ses cinq modules étendus ; le wiki, la table, le graphe, les choix,
les réglages et les permissions font partie du cœur.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Stack](#stack)
- [Démarrage](#démarrage)
- [Scripts](#scripts)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Versioning](#versioning)
- [Licence](#licence)

## Fonctionnalités

### Table de jeu et campagne — 11 modules

| Module          | Rôle                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| **Table (VTT)** | Canvas PixiJS : scènes, jetons, murs typés, vision par jeton, brouillard de guerre, chat et dés synchronisés |
| **Wiki**        | Entrées liées en `[[double crochets]]`, blocs, notes MJ secrètes, backlinks, historique                      |
| **Graphe**      | Vue des entités et de leurs liens, zoom/pan autour du curseur, recentrage                                    |
| **Journal**     | Handouts et images partagés aux joueurs, brouillons côté MJ                                                  |
| **Choix**       | Sondages de campagne, votes des joueurs, résolution et archivage par le MJ                                   |
| **Ambiance**    | Playlists et transport audio synchronisé pour toute la table                                                 |
| **Combat**      | Tracker d'initiative, tours et rounds en temps réel                                                          |
| **Fiches**      | Feuilles de personnage issues des templates, assignables à un ou plusieurs joueurs                           |
| **Macros**      | Macros exécutées dans une iframe `sandbox` sans origine (`new Function` confiné), avec chat intégré          |
| **Réglages**    | Informations de campagne, thème sandboxé, code d'invitation                                                  |
| **Permissions** | Rôles MJ/PJ, visibilité par module, dernier MJ protégé                                                       |

Les modules **Combat**, **Journal**, **Ambiance**, **Fiches** et **Macros** sont des
plugins activables par campagne. Le wiki, la table et le graphe font partie du cœur.

### Studio d'écriture et bibliothèque

- Romans et chapitres en TipTap : autosave, statuts de publication, synopsis, comptage de mots.
- Mise en page d'impression, couverture, genres et tags, rôle collaborateur éditeur.
- Partage par lien révocable en lecture, relecture ou édition ; pages publiques en `noindex`.
- **Bibliothèque publique** : parcours et filtrage des romans publiés (recherche, auteur, genre, tag).

### Transverse

- **Templates de fiches** : constructeur de champs, modèles prêts à l'emploi (Personnage, Lieu, Objet) et systèmes de jeu préconfigurés (D&D 5e, L'Appel de Cthulhu, Alien RPG, Narratif, Cyberpunk, Dark Fantasy, Enquête) ou homebrew.
- **Palette de commandes** (`Ctrl/Cmd + K`), thème sombre natif, mode `?embed=1` pour intégrer un module dans un bureau VTT.
- **Auth** Better Auth : e-mail/mot de passe et OAuth Discord/GitHub (boutons affichés seulement si les variables sont présentes).
- Pages partagées publiques (wiki, romans) sans compte.

## Architecture

```txt
aetheris/
├── apps/
│   ├── web/                 Next.js 16 — UI, Server Actions, BFF, auth
│   └── server/              NestJS — WebSockets temps réel, plugins, API
├── packages/
│   ├── database/            Schéma Prisma + migrations + client
│   ├── shared/              Contrats Zod partagés (HTTP/WS, formules, systèmes de jeu)
│   └── plugin-api/          API publique des plugins
├── e2e/                     Tests Playwright bout-en-bout
├── ROADMAP.md               Plan de développement par phase
└── CHANGELOG.md             Historique des versions
```

Le front (Next) porte les pages et les Server Actions ; le serveur Nest tient les
sockets (scènes, chat, combat, ambiance) derrière un garde de session. Les deux
partagent les mêmes contrats de données via `@aetheris/shared`.

## Stack

| Couche     | Technologies                                                         |
| ---------- | -------------------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 |
| Backend    | NestJS · Socket.io · Helmet · rate limiting                          |
| Éditeur    | TipTap / ProseMirror                                                 |
| Moteur VTT | PixiJS v8                                                            |
| Données    | PostgreSQL (Neon) · Prisma                                           |
| Auth       | Better Auth                                                          |
| Tests      | Vitest · Playwright · `node:test`                                    |
| Monorepo   | pnpm workspaces · Turborepo                                          |

## Démarrage

### Prérequis

- Node.js 24 et pnpm 10.12.4 (épinglé via `packageManager`)
- Une base PostgreSQL (Neon ou locale)

### Installation

```bash
pnpm install
```

Le `postinstall` génère le client Prisma.

### Variables d'environnement

Copier `.env.example` vers `.env` à la **racine** (source unique lue par Next et Prisma) :

| Variable                | Requis | Usage                                              |
| ----------------------- | ------ | -------------------------------------------------- |
| `DATABASE_URL`          | oui    | Connexion PostgreSQL (pooler)                      |
| `BETTER_AUTH_SECRET`    | oui    | Signature des sessions                             |
| `BETTER_AUTH_URL`       | oui    | URL publique de l'app (doit viser le port web)     |
| `WEB_ORIGIN`            | prod   | Origine autorisée pour CORS et Socket.io           |
| `NEXT_PUBLIC_WS_URL`    | prod   | URL du serveur Nest vue par le navigateur          |
| `BLOB_READ_WRITE_TOKEN` | prod   | Stockage des images uploadées (Vercel Blob)        |
| `DISCORD_CLIENT_*`      | non    | OAuth Discord (les 2 variables activent le bouton) |
| `GITHUB_CLIENT_*`       | non    | OAuth GitHub (les 2 variables activent le bouton)  |

En local, les secrets du projet sont chiffrés dans `.enc.env` et débloqués via
`shadow-secret unlock` (voir `project.yaml`).

### Base de données

```bash
pnpm db:generate   # générer le client Prisma
pnpm db:push       # appliquer le schéma (base Neon sans baseline de migrations)
pnpm db:migrate    # migrations versionnées (nécessite un historique baseline)
pnpm db:studio     # explorer les données
```

> Sur la base Neon actuelle, l'historique de migrations n'a pas été baseline :
> utiliser `pnpm db:push`. Arrêter `pnpm dev` avant `db:generate` — le client
> Prisma est verrouillé par le serveur de dev (EPERM sous Windows).

### Lancer

```bash
pnpm dev
```

- Web : http://localhost:3001 (port épinglé)
- Nest : http://localhost:3002

## Scripts

| Commande         | Effet                                                            |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm dev`       | Web en dev + serveur Nest (`nest start`, sans watch)             |
| `pnpm build`     | Build production (Turbo)                                         |
| `pnpm check`     | `typecheck` + `lint` + `test` — le gate avant commit             |
| `pnpm lint`      | ESLint (web) + oxlint (serveur)                                  |
| `pnpm typecheck` | `tsc --noEmit` (web, serveur, shared, plugin-api ; pas database) |
| `pnpm test`      | Tests unitaires (Vitest, `node:test`)                            |
| `pnpm test:e2e`  | Playwright (serveurs de dev déjà lancés requis)                  |
| `pnpm fmt`       | Formate avec oxfmt                                               |
| `pnpm fmt:check` | Vérifie le formatage sans écrire                                 |
| `pnpm db:*`      | `generate`, `migrate`, `push`, `studio`                          |

## Tests

- **Unitaires** : `pnpm test` — contrats partagés, logique de features, composants.
- **Bout-en-bout** : `pnpm test:e2e` — Playwright sur `http://localhost:3001`. Les
  serveurs ne sont pas démarrés automatiquement : lancer `pnpm dev` avant.

## Déploiement

Le dépôt est prêt pour **Vercel Services** (`vercel.json`) : un service Nest
(`apps/server`) et un service Next (`apps/web`), avec des rewrites `/api/auth` et
`/api/uploads` vers le web, `/api` et `/socket.io` vers le serveur. Renseigner les
variables d'environnement ci-dessus dans le projet Vercel (`WEB_ORIGIN` et
`NEXT_PUBLIC_WS_URL` incluses). Les images uploadées passent par Vercel Blob :
provisionner un store et `BLOB_READ_WRITE_TOKEN` (voir [docs/storage.md](./docs/storage.md)).

## Versioning

Aetheris suit [SemVer](https://semver.org/lang/fr/) et un format de commit dédié :

```txt
TYPE: aetheris - vX.Y.Z

- Changement 1
- Changement 2

Verification:
- pnpm check: OK
- pnpm test:e2e: OK
```

`RELEASE` = majeur, `UPDATE` = mineur, `PATCH` = correctif. L'historique complet des
versions est tenu dans [CHANGELOG.md](./CHANGELOG.md) ; la version courante est
propagée dans les `package.json` de tous les workspaces.

## Licence

[MIT](./LICENSE) © 2026 Oalacea
