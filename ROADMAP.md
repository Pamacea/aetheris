# ROADMAP — Aetheris

> **Plateforme VTT & Lore Studio (All-in-One)**
> Version : 1.2.0 | Dernière mise à jour : 2026-10-15 (statuts réels consignés par phase)
> Document de planification du développement. Chaque phase est indépendante et livrable.
> **Local-first** : le dev tourne en local (serveurs `localhost`), la base est sur **Neon** (PostgreSQL serverless). Pas de déploiement cloud pour l'instant.

---

## Vision

Une plateforme web modulaire réunissant :

- **Knowledge Base** façon Obsidian (notes interconnectées, liens `[[bidirectionnels]]`, graphe)
- **Virtual Tabletop** façon Foundry VTT (canvas PixiJS, tokens, lumière, brouillard de guerre)
- **Gestion de campagne** façon Amcel (fiches, templates JSON, systèmes de jeu)
- **Studio d'écriture** : romans et chapitres, éditeur type Google Docs (autosave, statuts, publication)

**Maître mot : extensibilité.** Un cœur léger + des modules activables à la volée, par campagne.

---

## Stack Technique (verrouillée)

| Couche                  | Technologies                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Frontend                | React 19 / Next.js (App Router) + TypeScript strict                                  |
| Styling                 | Tailwind CSS v4 + Shadcn UI + composants custom                                      |
| Validation              | Zod + ESLint                                                                         |
| Auth                    | **Better Auth** (mot de passe + OAuth, sessions, plugin Prisma)                      |
| Moteur VTT              | PixiJS v8+ (WebGL/WebGPU)                                                            |
| Éditeur (Lore & Romans) | TipTap / ProseMirror (Markdown, slash commands, liens, autosave)                     |
| Backend                 | NestJS (WebSockets, orchestration) + Next.js (BFF / Server Actions)                  |
| Temps réel              | Socket.io via `@nestjs/websockets`                                                   |
| DB                      | **Neon (PostgreSQL serverless)** + Prisma ORM — secrets gérés via shadow-secret/sops |
| Architecture            | Plugin-Oriented (Core + Modules)                                                     |
| Thème                   | Dark mode natif, accents CSS variables, injection custom sandboxée                   |

---

## Arborescence Cible des Pages

```
/                                # Landing page (pitch + login/inscription)
/login | /register               # Auth (Better Auth)
/dashboard                       # Campagnes (GM/Joueur) + romans + settings compte
/campaign/[id]                   # Hub central de campagne
/campaign/[id]/wiki              # Éditeur de Lore plein écran
/campaign/[id]/vtt               # Interface de jeu tri-panneaux
/campaign/[id]/chat              # Chat + dés (mode Theatre of the Mind)
/novels                          # Liste des romans (brouillons / publiés)
/novels/[id]                     # Vue roman : chapitres, statut, publication
/novels/[id]/chapters/[chId]     # Éditeur de chapitre (type Google Docs)
/builder                         # Constructeur de systèmes de règles, macros, modules
/api/ws                          # Endpoint caché — WebSockets
```

---

## Structure Monorepo Cible

```
aetheris/
├── apps/
│   ├── web/                      # Next.js (App Router)
│   │   ├── app/                  # Routing uniquement
│   │   ├── features/             # Logique métier par feature
│   │   ├── ui/                   # Composants présentation (Shadcn + custom)
│   │   └── lib/                  # Utilitaires partagés
│   └── server/                   # NestJS
│       ├── src/core/             # Prisma, Auth, WS adapter, PluginRegistry
│       ├── src/plugins/          # lore/ vtt/ dice/ combat/ sheets/
│       └── src/app.module.ts
├── packages/
│   ├── database/                 # Prisma : schéma, migrations, client partagé (web + server)
│   ├── shared/                   # Types + schémas Zod partagés (contrats WS/HTTP)
│   ├── plugin-api/               # API publique des plugins (manifest, hooks)
│   └── config/                   # ESLint, TS, Tailwind presets
├── .enc.env                      # Secrets chiffrés (shadow-secret / sops) — Neon DATABASE_URL
├── docs/
└── ROADMAP.md
```

---

## Modèle de Données Prisma (référence)

```prisma
model Campaign {
  id             String   @id @default(uuid())
  title          String
  customScript   String?  // JS custom injecté (bac à sable)
  customStyles   String?  // CSS custom injecté
  enabledPlugins String[] // ids des plugins activés
  entities       Entity[]
  templates      JsonTemplate[]
  scenes         Scene[]
  members        CampaignMember[]
  createdAt      DateTime @default(now())
}

model JsonTemplate {
  id         String   @id @default(uuid())
  name       String   // ex: "Fiche PNJ D&D5e"
  schema     Json     // structure de champs (validée par Zod)
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id])
}

model Entity {
  id          String   @id @default(uuid())
  title       String
  type        String   // id du template
  data        Json     // données saisies selon le template
  contentHtml String?  // corps de la note (lore)
  campaignId  String
  campaign    Campaign @relation(fields: [campaignId], references: [id])
}

// --- Romans (module d'écriture) ---
model Novel {
  id          String    @id @default(uuid())
  title       String
  synopsis    String?
  status      String    @default("draft")   // draft | writing | published
  coverImage  String?
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  chapters    Chapter[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Chapter {
  id          String   @id @default(uuid())
  title       String
  position    Int      // ordre dans le roman
  content     Json?    // document TipTap (JSON structuré)
  wordCount   Int      @default(0)
  status      String   @default("draft")    // draft | review | published
  publishedAt DateTime?
  novelId     String
  novel       Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
// + tables Better Auth (user, session, account, verification)
// + CampaignMember (role: GM | PLAYER), Scene, Token, JournalEntry...
```

---

## Principes Directeurs

1. **Correctness > Completeness > Speed** — le code doit fonctionner avant d'être complet.
2. **Contrats partagés** — tout payload HTTP/WS est défini en Zod dans `packages/shared`, consommé par Next.js ET NestJS.
3. **Core minimal** — auth, layout, plugins, thèmes dans le core ; tout le reste est un module.
4. **Découplage par événements** — `@nestjs/event-emitter` entre plugins (ex: VTT émet → Lore écoute), jamais de dépendances directes entre plugins.
5. **Lazy loading** — `LazyModuleLoader` + `PluginRegistry` + `PluginGuard` pour activer/désactiver un plugin au runtime sans redémarrage.
6. **Sécurité** — JS/CSS custom des campagnes exécuté dans un bac à sable (iframe isolé / `vm` côté serveur, aucune injection directe dans le DOM parent).

---

# Phases de Développement

## Phase 0 — Fondations Monorepo

**Objectif :** squelette compilable, outillage, CI de base.

> **Statut 2026-10-15 : ✅** Monorepo, apps, packages, 8 migrations, gates `pnpm check` verts. Reste : script Oxfmt absent des package.json ; `pnpm dev`/`pnpm build` à vérifier.

- [ ] Initialiser le monorepo (pnpm workspaces + Turborepo)
- [ ] `apps/web` : Next.js 15+, TypeScript strict, ESLint, Tailwind v4, Shadcn UI
- [ ] `apps/server` : NestJS + Swagger healthcheck
- [ ] `packages/shared` : schémas Zod de base + exports types
- [ ] `packages/database` : Prisma + **Neon** (`.env` via shadow-secret, migration initiale)
- [ ] Formatage Oxfmt, hooks quality gates (typecheck → lint → fmt → test)
- [ ] README + structure documentée

**Critère de sortie :** `pnpm dev` lance web + server ; `pnpm build` passe ; 1 migration Prisma appliquée.

---

## Phase 1 — Core : Auth, Layout, Thèmes

**Objectif :** le socle applicatif sur lequel tout se greffe.

> **Statut 2026-10-16 : ✅** Better Auth (login/register/sessions), rôles GM/PLAYER + invitation, landing, dashboard, tri-panel, command palette, thème dark. Mode Theatre of the Mind **implémenté** (bouton « Théâtre » dans la barre d'outils VTT : masque la table, chat/dés restent actifs) **et vérifié en browser** (aller-retour placeholder ↔ carte). Join par code d'invitation **implémenté** (`joinCampaignByCode` upsert PLAYER + formulaire « Rejoindre » sur `/dashboard`, vérifié en browser + test E2E).

- [ ] **Auth Better Auth** : inscription/connexion email+mot de passe, sessions, tables `user/session/account/verification` via plugin Prisma
- [ ] Modèle `User` + `CampaignMember` (rôles GM / PLAYER, permissions granulaires)
- [ ] Landing page `/` et `/dashboard` (CRUD campagnes, join par invitation)
- [ ] **Layout tri-panneaux encrable** (drag pour redimensionner, ordre persistant) :
  - Gauche : arborescence Lore
  - Centre : zone basculable (VTT ↔ Éditeur)
  - Droite : chat / dés / inspecteur
- [ ] Système de thèmes : dark mode par défaut, accents via CSS variables (Tailwind v4)
- [ ] **Command Palette** universelle (`Ctrl/Cmd+K`) : ouvrir note, lancer dé, invoquer entité
- [ ] Mode "Theatre of the Mind" : repli de la VTT en 1 clic

**Critère de sortie :** un utilisateur connecté crée une campagne et voit le layout tri-panneaux fonctionnel.

---

## Phase 2 — Backend NestJS : Architecture Plugin + Temps Réel

**Objectif :** le moteur serveur prêt à recevoir les modules.

> **Statut 2026-10-15 : ✅** PrismaService, guards HTTP/WS, `PluginRegistry` (`@RegisterPlugin` + PluginGuard), rooms campagne, `@nestjs/event-emitter`, contrats WS Zod dans `packages/shared`. Plugin démo : `ping`.

- [ ] `core/database` : PrismaService global
- [ ] `core/auth` : Guards JWT HTTP + middleware d'authentification WS
- [ ] `core/websocket` : adaptateur Socket.io global, filtres d'erreurs WS
- [ ] **PluginRegistry** :
  - décorateur `@RegisterPlugin(manifest)`
  - `PluginRegistryService` avec `LazyModuleLoader`
  - `PluginGuard` (HTTP) + handler guard (WS) vérifiant `campaign.enabledPlugins`
- [ ] Bus d'événements internes (`@nestjs/event-emitter`)
- [ ] Rooms WS par campagne : `campaign:${campaignId}` rejointe à la connexion JWT
- [ ] Contrat d'événements WS typé dans `packages/shared` (`token:moved`, `scene:change`, `fog:update`, `dice:rolled`, `chat:message`)

**Critère de sortie :** un plugin vide activable/désactivable par campagne ; un client rejoint la room de sa campagne.

---

## Phase 3 — Module Knowledge Base (héritage Obsidian)

**Objectif :** le cœur éditorial.

> **Statut 2026-10-16 : ✅** TipTap + slash commands, liens `[[…]]` avec suggestions, backlinks, graphe, dossiers + versions (migration), blocs secrets GM. UI d'historique **vérifiée en browser** : panneau HISTORIQUE, création d'une version à l'édition (throttle 5 min), liste datée, restauration (contenu revenu à l'état antérieur).

- [ ] Éditeur TipTap : WYSIWYG + Markdown, raccourcis clavier, slash commands `/`
- [ ] Liens bidirectionnels `[[Nom de l'entité]]` :
  - autocomplete des entités existantes
  - création automatique d'une fiche si lien inconnu
  - backlinks (liste des références entrantes)
- [ ] Graphe de connaissances (visualisation nodale, ex. `react-force-graph`)
- [ ] **Blocs secrets GM** : segments "visible GM uniquement" au sein d'une note publique (filtrés côté serveur pour les joueurs)
- [ ] Pages `/campaign/[id]/wiki` plein écran + panneau gauche (dossiers, recherche)
- [ ] Sauvegarde (autosave + historique versions basique)

**Critère de sortie :** rédiger une note avec liens, cliquer un lien, voir les backlinks et le graphe.

---

## Phase 4 — Templates JSON Dynamiques

**Objectif :** fiches de personnages entièrement configurables.

> **Statut 2026-10-16 : ✅** Builder de templates (`/wiki/templates`), rendu dynamique (`template-form`), macros `@attributs` (`lib/formula.ts`), catégories de templates. Drag & drop note → fiche **implémenté et vérifié en browser** : drop d'une note de la palette sur un champ texte/textarea insère `[[Titre]]`, drop sur un champ tag affecte la note (si catégorie cible), autosave + persistance après reload.

- [ ] Modèle `JsonTemplate` + validation Zod à la volée (schéma stocké en BDD)
- [ ] **Template Builder** (interface visuelle) :
  - types de champs : texte, nombre, compteur, liste, sous-entité, formule mathématique
  - ordre, labels, valeurs par défaut
- [ ] Rendu dynamique de fiche à partir du template + `data` de l'`Entity`
- [ ] Drag & drop universel : objet d'une note → feuille de perso (équipement)
- [ ] Macros d'attributs : `@force`, `@dexterite` résolues depuis `entity.data`

**Critère de sortie :** créer un template "PNJ D&D5e", générer 2 fiches, les éditer et les lier au lore.

---

## Phase 5 — Module VTT (canvas PixiJS)

**Objectif :** la table de jeu, d'abord locale (synchronisation en Phase 6).

> **Statut 2026-10-16 : ✅** PixiJS multi-calques, grille carrée/hex/sans grille, tokens, murs & LOS, brouillard, palette de notes drag & drop. **Vérifié en browser** : grille hex rendue, murs dessinés + persistés en BDD, brouillard activé avec portée dynamique, drop palette → token lié. **Fix** : seed de `wallStates` à `[]` (miroir partagé avec `settingsRef` → garde d'égalité → redraw jamais appelé au replay après reload).

- [ ] Canvas PixiJS v8 avec scènes multi-calques :
      `Fond → Grille → Tokens → Lumière/Ombre → Overlay MJ`
- [ ] Upload de cartes ; grilles **carrée / hexagonale / sans grille** paramétrables (taille, offset)
- [ ] Tokens : créer, déplacer (snap-to-grid), redimensionner, rotation, barres PV
- [ ] **Drag & drop depuis le Wiki** : entité PNJ → token instancié sur la carte
- [ ] Murs & ligne de vue (Line of Sight) — outil éditeur MJ
- [ ] Brouillard de guerre dynamique selon vision des tokens
- [ ] Pages `/campaign/[id]/vtt` (centre du layout tri-panneaux)

**Critère de sortie :** une scène jouable en local avec grille, tokens, murs et brouillard.

---

## Phase 6 — Temps Réel : synchronisation VTT + Chat + Dés

**Objectif :** le multijoueur.

> **Statut 2026-10-15 : ✅** Sync tokens/scènes, chat + `/roll` (`dice:rolled`), contrats WS, chat persisté. **Arbitrage dés 3D (2026-10-16) : on garde les jets serveur simple** — la physique 3D (dep 3D + sync + anti-cheat seed) coûte cher pour un bénéfice purement cosmétique ; à revoir si le jeu en a besoin (critère : demande utilisateurs ou vitrine).

- [ ] Hook React `useCampaignSocket` (connexion active uniquement sur écrans de jeu)
- [ ] Synchronisation des tokens : `token:moved` broadcast par room, état persisté
- [ ] **Synchronisation des scènes** : GM clique "Activer la scène" → tous les clients basculent + ambiance sonore
- [ ] Chat temps réel (messages, `/roll`, historique persistant)
- [ ] **Moteur de dés** :
  - parser de dés (`2d6+3`, avantage, dés complexes)
  - jet de dés **3D** synchronisé (physique côté client, seed côté serveur pour anti-cheat)
  - macros : `/roll 1d20 + @force`
- [ ] Persistance WS (reconnexion, état cross-refresh)

**Critère de sortie :** 2 navigateurs voient les mêmes tokens bouger, les mêmes dés rouler, le même chat.

---

## Phase 7 — Module Romans (Studio d'Écriture)

**Objectif :** écrire des romans chapitre par chapitre, façon Google Docs.

> **Statut 2026-10-16 : ✅** Pages, CRUD romans/chapitres, éditeur autosave (debounce 1 s + fallback localStorage), compte-mots, statuts, lecture des chapitres publiés pour non-auteur. Réordonnancement drag **vérifié en browser** : drag natif HTML5 chapitre 2 → position 1, ordre persisté après reload.

- [ ] Pages `/novels` (liste : couverture, statut, nb de chapitres, recherche) et `/novels/[id]` (vue roman)
- [ ] CRUD roman : titre, synopsis, couverture, **statut du roman** (`draft` → `writing` → `published`)
- [ ] CRUD chapitres : création, renommage, réordonnancement (drag), **statut du chapitre** (`draft` → `review` → `published`)
- [ ] **Éditeur TipTap plein écran** `/novels/[id]/chapters/[chId]` :
  - style Google Docs : page centrée, typographie Serif éditoriale, barre d'outils flottante
  - raccourcis clavier (gras, italique, titres, listes)
  - **sauvegarde automatique** (debounce ~1 s, indicateur "Enregistré / Enregistrement…" + fallback local storage)
  - compteur de mots live, sauvegarde à la fermeture
- [ ] Statistiques : mots par chapitre, mot total du roman, progression
- [ ] **Publication** : bascule publiée/brouillon par chapitre ET par roman ; les chapitres publiés sont visibles en lecture (`/novels/[id]` en mode lecture publique)
- [ ] Contrôle d'accès : seul l'auteur édite ; lecteurs non connectés ne voient que le publié
- [ ] Entrée `/novels` dans la navigation + command palette

**Critère de sortie :** créer un roman, écrire 2 chapitres avec autosave fonctionnel, changer les statuts, publier un chapitre et le voir en lecture seule sans être connecté.

---

## Phase 8 — Modules Étendus

**Objectif :** compléter l'offre fonctionnelle (chaque item = plugin séparé).

> **Statut 2026-10-16 : ✅** Combat, journal, ambiance (route + sync WS + migration `phase8_ambiance`), fiche token→Entity dans la VTT. Sync 2 onglets vérifiée en browser : ambiance (Pause MJ → « Lecture » côté joueur), scène (drag token MJ → position à jour côté joueur), dés/chat (`/roll` MJ → visible côté joueur). Autoplay : lecture synchrone observée des deux côtés, contrôle lecture/pause manuel disponible si le navigateur bloque.

- [x] **Combat / Initiative** : tracker de tour, initiative rollé, tour suivant
- [x] **Journal / Captures** : handouts et images partagées aux joueurs
- [x] **Ambiance sonore** : playlists par scène, audio synchronisé _(livré 2026-10-15 : route `/ambiance`, sync WS `ambiance:state`, migration `phase8_ambiance` — UI créée et vérifiée en browser)_
- [x] **Fiches joueurs** : feuille de personnage liée au token, éditable par le joueur _(livré : panneau fiche dans la VTT via `noteId` → Entity, réutilise `template-form`)_
- [x] **Constructeur de macros** dans `/builder` (code JS sandboxé par campagne) _(livré avec la Phase 10 — sandbox iframe vérifiée)_

**Critère de sortie :** un module peut être ajouté sans toucher au core, activable/désactivable par campagne.

---

## Phase 9 — Moteur de Thèmes Custom (style Foundry)

**Objectif :** personnalisation poussée par les utilisateurs.

> **Statut 2026-10-15 : ✅** Éditeur CSS/JS (`/campaign/[id]/settings`), JS en iframe `sandbox="allow-scripts"` sans origine, CSS sanitisé (shortcut : pas de trusted-types — casserait React/TipTap), presets + export/import JSON, vars `--aetheris-*`, fonts `next/font` (Newsreader/Plus Jakarta Sans), CSP dans `next.config.ts` (`'unsafe-eval'` dev-only requis par React 19). Vérifié en browser (preset, enregistrement, sandbox prouvée).

- [ ] Éditeur CSS/JS custom par campagne (`customStyles`, `customScript`)
- [ ] **Bac à sable** : exécution isolée (iframe / `trusted-types` / CSP stricte), aucune écriture directe dans le DOM parent
- [ ] Variables CSS de thème exposées comme API publique (`--aetheris-accent`, surfaces, typographies)
- [ ] Gestionnaire de thèmes : presets partageables, export/import JSON
- [ ] Typographie : Serif (Newsreader / Source Serif 4) pour le lore, Sans (Plus Jakarta Sans / Inter) pour l'UI — via `next/font`

**Critère de sortie :** une campagne applique un thème custom qui ne casse ni le layout ni les autres campagnes.

---

## Phase 10 — Builder & Espace Développeur

**Objectif :** l'atelier de configuration.

> **Statut 2026-10-16 : ✅** `/builder` (systèmes de règles, modules par campagne, macros sandboxées testées), `packages/plugin-api` + README, permissions (`/campaign/[id]/permissions`, rôles + grants de vue persistés — migration `phase10_permissions` : refus lu par `requireCampaignPlugin` → 404, cases éditables côté MJ), export/import ZIP (jszip, validation Zod, round-trip OK), entrées nav + palette. Hooks plugins exécutions vérifiés : dispatch `objet:action` depuis le gateway (`chat:message`, `campaign:joined`, `dice:rolled`), handler `PLUGIN_HOOK_HANDLER` chargé lazy, filtrage par `enabledPlugins`, erreurs jamais propagées — 4 tests unitaires + log runtime `[PingService] Hook chat:message reçu` observé.

- [ ] `/builder` : gestion des templates de règles, macros, modules
- [ ] Gestion des plugins par campagne (install/activer/configurer) via `PluginRegistry`
- [ ] Éditeur de permissions granulaires (qui voit quoi : entités, scènes, secrets)
- [ ] Export / import de campagne ( ZIP JSON : lore, templates, scènes )
- [ ] Documentation interne de l'API plugin (`packages/plugin-api`)

**Critère de sortie :** créer une campagne from scratch (templates → entités → scène → plugins) sans toucher au code.

---

## Phase 11 — Qualité, Perf, Lancement

**Objectif :** production.

> **Statut 2026-10-16 : ✅** 88+ tests unitaires (parser dés 30, autosave romans 12, formules 10, export ZIP 16, thèmes 10, gateway/registry/grants…) — `pnpm check` 10/10 verts (1 warning lint `<img>`). E2E Playwright 4/4 verts (`campaign` + join par code, `multiplayer`, `novel`). Audit OWASP corrigé : `requireMember()` WS par handler (cache 30 s), rate-limit `/api/auth/*` 100 req/min/IP (429 vérifié live), rate-limit WS `dice:roll`/`chat:send` 5/s, XSS `contentHtml` inerte (TipTap ProseMirror, aucun `dangerouslySetInnerHTML`). Perf VTT : 60 fps / latence WS ~19 ms, fixes `scheduleFog` (coalescing rAF) + update tokens in-place — storm-120 60,1 fps. A11y : Lighthouse 100/100 sur `/`, `/login`, `/dashboard`, `/register` ; piège de focus palette ⌘K, contraste accents corrigés (campagne 96 : 24 contrastes hérités restent).

- [ ] Tests : unitaires (parser dés, templates Zod, autosave romans) + E2E (Playwright : création campagne, session de jeu 2 clients, écriture d'un chapitre)
- [ ] Type coverage 100 % (zéro `any`), lint strict
- [ ] Perf VTT : profiler rendu Pixi (cibles : 60 fps, < 100 ms latence WS)
- [ ] Sécurité : audit OWASP (injection XSS via notes/thèmes, authz WS, rate limit)
- [ ] Accessibilité : navigation clavier palette, contraste dark mode
- [ ] Déploiement _(ultérieur, hors scope local-first)_ : Vercel (web) + Railway/Render (NestJS) + Neon (DB)
- [ ] Landing page finalisée, onboarding, documentation utilisateur

**Critère de sortie :** app stable en local, jouable à distance sur LAN, prête à être proposée à d'autres.

---

## Phase 12 — Table de jeu centrale (blocs, modales, fiches codables)

**Objectif :** faire de la table de jeu le centre de l'app : blocs structurés dans les notes, modules ouvrables en modale depuis la VTT, fiches codables, apparence cohérente avec le thème.

> **Statut 2026-10-17 : ✅ Terminé** (W0-W12 vérifiés code + browser, gates verts : fmt + turbo 10/10 + unit 31/29 + E2E 4/4 — décisions : fiches codables par phases, thème MJ seul (apparence étendue seulement), onglet Blocs = palette d'insertion + métadonnées).

- [x] **W0 — Refcount socket** : `use-campaign-socket.ts` ne déconnecte plus la socket si d'autres composants la consomment (prérequis des modales) ✅
- [x] **W1 — Panneaux VTT collapsables** : boutons réduire/rouvrir + persistance localStorage (`tri-panel.tsx`, le resize existe déjà) ✅ (vérifié reload)
- [x] **W4 — Modales table de jeu** : Combat, Ambiance, Macros ouvrables depuis la tool bar VTT (gating plugin activé + grants `canViewModule` = « si le MJ le veut ») ✅ (GM + joueur, Échap/focus)
- [x] **W8 — Blocs wiki** : sous-onglet « Blocs » (palette d'insertion TipTap date/événements/description/catégories avec packs SF/médiéval/horreur + métadonnées structurées de la note) ; blocs MJ filtrés via `stripGmSecrets` ✅ (persistance + filtre joueur vérifiés)
- [x] **W9 — Champs code fiches (phase 1)** : kinds `css`/`js` dans les templates, sandbox iframe partagée avec le builder macros, éditables par les joueurs _(phase 2 ultérieure : blueprint type UE5 — hors portée)_ ✅ (CSS live, exécution JS, timeout 2 s)
- [x] **W2 — Thème → tokens Pixi** : les vars `--aetheris-*` pilotent tokens, grille et barres PV ✅ (bascule Ember/Parchemin vérifiée ; garde-fou `minLum` dans `lib/pixi-theme.ts` + tests : thème clair ≠ labels illisibles sur table sombre)
- [x] **W6 — Ambiance : volume** : volume global MJ synchronisé + volume local par joueur persisté ; modale ambiance dans la VTT ✅ (effectif = local × global, local persisté reload)
- [x] **W5 — Lore lisible depuis la VTT** : clic sur une note de la palette → corps de note dans le panneau, liens `[[…]]` naviguents, `gm-secret` filtré côté joueur ✅ (secret absent côté PJ)
- [x] **W10 — Presets de templates** : « Fiche joueur », « PNJ », « Bestiaire » prêts à l'emploi dans le builder ✅ (preset créé + catégorie Personnages visible palette)
- [x] **W7 — Palette PNJ** : sections Notes / Personnages (badge = template) + création « + PNJ » depuis la VTT, fiche ouvrable depuis la palette ✅ (création + refresh + fiche 12 champs)
- [x] **W3 — Token visuel « note »** : rectangle parchemin avec coin replié au lieu du disque, pour les tokens liés à une note ✅ (titre tronqué 2-3 lignes + clic → fiche ; disque personnage intact)
- [x] **W11 — Audio ambiance persistant + boucle** : singleton `lib/ambiance-audio.ts` hors arbre React (la lecture survit à la fermeture de la modale) + option ⟳ Boucle MJ synchronisée ; `GameModal` garde ses enfants montés (cachés) pour que l'état survive à la réouverture et que les joueurs suivent la synchro même modale fermée ✅ (boucle + lecture hors modale + pause/play reçus par le joueur sans ouvrir sa modale)
- [x] **W12 — Théâtre of the Mind** : en mode théâtre, les notes de la palette se glissent dans la zone (pas de vide au milieu) et s'y ouvrent en fiche, visibles MJ + joueurs ✅ (drop + anti-doublon, sync `theatreNotes` via `scene:state`, clic → fiche dans les deux modes, ✕ MJ seul, persistance reload)

**Critère de sortie :** depuis la table de jeu on lit une note, on ouvre combat/ambiance/macros en modale sync 2 onglets, un token-note ressemble à une note, les tokens suivent le thème, un joueur code sa fiche (CSS/JS sandboxé), les panneaux se réduisent.

---

## Phase 13 — Jets de dés, types nombre, blocs macros

**Objectif :** un bouton ⚄ sur tout champ porteur d'une expression de jet (résultat inline + broadcast chat), des champs nombre au type choisi (entier/décimal × signé/positif) avec stepper DA, et des blocs « macro » dans le panneau Blocs (fiches comme notes libres) pour tout système de jeu : `intelligence + sagesse = Mana`, `1d20 + @mod`, etc.

> **Statut 2026-10-17 : ✅ Terminé** (W13/W14 vérifiés code + browser, gates verts : fmt + turbo 10/10 + unit 50/31/29 + E2E 4/4 — décisions : blocs macros aussi dans les blocs wiki, select 4 types de nombre remplaçant Décimales + Min, substitution des macros côté client avec portée de la fiche).

- [x] **W13 — Champs fiche : bouton dé + types nombre + stepper** : fix racine `substituteMacros` (macro négative après `+` ne casse plus le parse — profite au chat serveur sans change serveur), `roll` optionnel sur kinds `number`/`counter`/`formula` validé par `superRefine` à l'écriture du template (message d'erreur remonté dans le builder), hook `use-dice-roll.ts` (substitution client → `dice:roll` → broadcast), bouton ⚄ + résultat inline (total + détail) sur les 3 kinds, stepper `− | valeur | +` sans chevrons natifs (clamp min/max au clic), select **Type de nombre** (Entier/Décimal × positif/signé) ✅ (erreur expr invalide affichée en rouge, Force signé accepte −1, `1d20 + @force` avec mod négatif → 13 (14) inline + chat MJ + joueur)
- [x] **W14 — Blocs macros wiki** : kind `macro` (`expr` calcul + `roll` jet + `refNoteId` fiche source) dans `noteBlockSchema` (optionnels, pas de migration), verrous anti-fiche levés (4 endroits) avec anti-fuite conservée (`withoutBlocks` sur `active.data` + strip dans `getWikiFiche`), autosave fiche préserve les blocs (`saveTemplateData` ne purge plus, injection client bloquée), panneau Blocs éditable sur fiche + select Source (fiches de la campagne) avec preview du calcul via `getWikiFiche` → `buildFormulaScope`, bouton ⚄ avec portée de la fiche source, lecture joueur = valeur + ⚄ sans éditeur ✅ (bloc Mana `force + constitution` = 2 côté fiche et note libre, autosave ne purge pas après reload, bloc `gm` absent côté joueur, jet depuis note libre = scope distant 15 (12), `saveNoteBlocks` MJ seule)

**Critère de sortie :** on configure un champ nombre entier signé avec `1d20 + @mod` dans le builder, on jette depuis la fiche (résultat inline + chat des 2 clients, mod négatif inclus), on crée un bloc macro `intelligence + sagesse = Mana` sur une fiche comme sur une note libre, et l'autosave d'une fiche ne purge jamais ses blocs.

---

## Phase 14 — Champs compacts, listes structurées, bibliothèque de blocs

**Objectif :** champs compacts (largeur/taille + config par champ repliée ⚙), select enrichi (options issues des notes, champ libre, chevron décollé), kind `multiSelect` (tags de sorts) et kind `list` générique avec agrégats no-code (`inventaire_poids + force`), panneau Blocs sans boutons Ajouter/Enregistrer (autosave + sous-onglets Blocs/Bibliothèque + glisser-déposer complet), scrollbars masquées sur la table de jeu.

> **Statut 2026-10-17 : ✅ Terminé** (W16-W20 vérifiés code + browser, gates verts : fmt + turbo 10/10 + unit 58/33/29 + E2E 4/4 — décisions : agrégats de formule calculés **côté client uniquement** (`resolveMacros` serveur hors portée → `@poids_total` indisponible au chat), drop Tiptap sans re-wrapping `gmSecret`, bibliothèque filtrée `gm` **côté serveur** + écriture GM seule, scroll central masqué aussi sur les pages TriPanel (journal/settings/macros/combat), presets list en type text, bascule d'onglet au survol d'un drag (DnD Blocs ⇄ Bibliothèque), `.input-sm` non-layeré écrase la cascade Tailwind).

- [x] **W16 — Fondations schema + sanitize + superRefine** : `width`/`size` sur tout kind, `selectOptionSchema` partagé, `maxLength` text/textarea, select `source: static|wiki` + `targetCategory` + `free` (`options` plus de `min(1)` en lecture), kinds `multiSelect` et `list` (colonnes text/number/select/tag, lignes dans `data`), superRefine d'écriture (options vides hors wiki, ids colonnes uniques, `n` réservé, collisions d'agrégats), `sanitizeFieldData` étendu (slice text, membership/free/wiki, cap 50/100) ✅ (shared 58/58)
- [x] **W17 — Agrégats formule + CSS + builder + form** : `buildFormulaScope` cas `list` → `${id}_n` + `${id}_${colId}` (sommes number), CSS `select.input` padding-inline 1rem + `.no-scrollbar`, builder : `⚙` replié par défaut (auto-déplié à l'insertion), configs kind regroupées (Min/Max groupés, Longueur/Taille, maxLength, source wiki + datalist catégorie + champ libre, éditeur de colonnes), presets **Listes** (Inventaire/Sorts/Compétences), form : largeurs `sm/md/full` + tailles `sm/md`, select wiki/free (datalist), `multiSelect` cases à cocher, `list` table avec `+ Ligne` et pied d'agrégats live ✅ (nombre court 63px, chevron décollé 16px, formule `inventaire_poids + force` = 6, superRefine OK)
- [x] **W18 — Blocs : autosave + sous-onglets + Bibliothèque + DnD** : `BLOCK_PRESETS` exporté, action `saveBlockLibrary` (GM seule), Entity `block-lib` filtrée des listes (wiki/vtt × 2), bibliothèque filtrée `gm` côté serveur, autosave 1,2 s + flush unmount, footer Ajouter/Enregistrer remplacé par statut `aria-live`, sous-onglets ARIA, DnD HTML5 (`BLOCK_MIME`) : bibliothèque→Tiptap (`handleDrop` ProseMirror), bibliothèque→liste, bloc→bibliothèque, reorder, **bascule d'onglet au dragover** (panneaux mutuellement exclusifs) ✅ (drop Tiptap insère le bloc, persistance reload, drop bloc→biblio « Enregistré », joueur : bloc `gm` masqué, 0 éditeur, 0 bouton Enregistrer)
- [x] **W19 — Scrollbars table de jeu** : `.no-scrollbar` + `no-scrollbar` sur le centre TriPanel et la fiche VTT ✅ (DOM confirmé, molette OK)
- [x] **W20 — Vérification + ROADMAP** : gates racine verts (fmt, fmt:check, check 10/10, E2E 4/4), checklist browser complète (builder, fiche, blocs, VTT, joueur, non-régressions), cette section ✅
- [x] **Post-14 — Correctifs demandés** : `phase` retirée du catalogue des modules (cartes sans numéro de phase), DnD Bibliothèque ⇄ Blocs réparé (les deux panneaux restent montés en `hidden` — la bascule au survol démontait la source du drag, qui s'annulait) + drop finalisé sur l'onglet lui-même, icône ⚙ par bloc avec Taille (`noteBlockSchema.size: sm|md|lg` optionnel, rétroactif) appliquée côté joueur ✅ (reorder + ajouts persistants après reload, favori créé, `text-lg` confirmé côté joueur, gates verts)
- [x] **Post-14 bis — Palette Blocs + blocs inline configurables** : palette « Ajouter un bloc » en tête de l'onglet Blocs (presets `BLOCK_PRESETS` + favoris de campagne, chips horizontales `no-scrollbar`, glisser **ou** cliquer pour insérer), et sur les blocs inline du corps (`MetaBlockView`) boutons ⚙ (Taille sm/md/lg via nouvel attr `size` rétroactif) + × (`deleteNode`) réservés à l'éditeur MJ (`editor.isEditable`) ; `data-size` ajouté à l'allowlist `sanitizeWikiHtml` (sinon strippé au save) ✅ (clic palette → liste, drag palette → liste, ⚙ → `text-lg` persistant après reload, suppression persistante, joueur : 0 ⚙/×/palette + blocs lecture seule, typecheck + 90 tests web verts)

**Critère de sortie :** on crée un champ liste Inventaire dans le builder via son preset (config repliée derrière ⚙), on ajoute des lignes dont la somme alimente une formule `inventaire_poids + force` affichée dans la fiche, on glisse un bloc de la Bibliothèque dans la note sans bouton Enregistrer (autosave), un joueur ne voit ni les blocs `gm` ni la bibliothèque complète, et la table de jeu défile à la molette sans scrollbar visible.

---

## Ordre de Dépendances

```
Phase 0 (squelette)
   └─→ Phase 1 (Better Auth + layout)
         └─→ Phase 2 (backend plugins + WS)
               ├─→ Phase 3 (wiki) ─→ Phase 4 (templates)
               ├─→ Phase 5 (VTT local) ─→ Phase 6 (temps réel)
               ├─→ Phase 7 (romans — dépend de 1, réutilise l'éditeur TipTap de 3)
               └─→ Phases 8-10 (modules, thèmes, builder)
                        └─→ Phase 11 (qualité + lancement)
```

**Parallélisable :** Phase 3 ∥ Phase 5 (après Phase 2). Phase 4 dépend de Phase 3. Phase 6 dépend de 2 + 5. **Phase 7 (romans) dépend uniquement de Phase 1** (auth) et peut démarrer dès que l'éditeur TipTap existe.

---

## Backlog / Idées Futures (hors scope initial)

- [ ] Fichiers de scène type "compendium" partagés entre campagnes
- [ ] IA d'assistance au lore (résumé, génération de PNJ)
- [ ] Mode hors-ligne (PWA + IndexedDB, sync au retour du réseau)
- [ ] Support VTT 3D (Three.js / Pixi 3D layer)
- [ ] Marketplace de plugins communautaires
- [ ] Application desktop (Electron/Tauri)

---

_Règle de progression : une phase n'est "done" que si son critère de sortie est atteint et que les quality gates passent (typecheck → lint → fmt → test)._
