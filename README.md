# Aetheris

> **Plateforme VTT & Lore Studio (All-in-One)** — Knowledge Base façon Obsidian, Virtual Tabletop façon Foundry, Studio d'écriture de romans.
> Voir [ROADMAP.md](./ROADMAP.md) pour le plan de développement complet.

## Stack

- **Frontend** : Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · Shadcn UI
- **Backend** : NestJS (WebSockets, plugins) · Next.js BFF
- **Éditeur** : TipTap / ProseMirror (lore + romans)
- **VTT** : PixiJS v8
- **DB** : Neon (PostgreSQL) + Prisma — secrets chiffrés via shadow-secret/sops (`.enc.env`)
- **Auth** : Better Auth
- **Monorepo** : pnpm workspaces + Turborepo

## Structure

```
apps/web/          Next.js (UI, BFF, auth)
apps/server/       NestJS (WS temps réel, plugins)
packages/database/ Prisma schema + client
packages/shared/   Contrats Zod partagés (HTTP/WS)
packages/plugin-api/ API publique des plugins (à venir)
```

## Commandes

```bash
pnpm install        # Dépendances workspaces
pnpm dev            # web (:3001) + server Nest (:3002) en watch
pnpm build          # Build production
pnpm check          # typecheck + lint + test
pnpm db:generate    # Générer le client Prisma
pnpm db:migrate     # Migration Prisma (Neon)
pnpm db:studio      # Prisma Studio
```

## Setup

1. `pnpm install`
2. Secrets : débloquer shadow-secret → le **`.env` à la racine** est la source unique
   des variables (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL…) ;
   Next et Prisma le lisent automatiquement (plus de `.env.local` par app)
3. `pnpm db:migrate`
4. `pnpm dev` → http://localhost:3001

> Ports : **web = 3001** (épinglé), **Nest = 3002** — évite les conflits avec
> d'autres projets locaux sur :3000. `BETTER_AUTH_URL` doit pointer sur le port web.
