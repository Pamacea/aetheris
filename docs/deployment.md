# Déploiement — Base de données (Prisma / PostgreSQL)

La base de production est une base Neon. `DATABASE_URL` est fournie par l'environnement
(`.env` en local, variables du projet en CI/hébergement) et ne doit jamais être commitée
ni affichée dans les logs.

## Commandes utiles

| Commande                                                     | Usage                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `pnpm db:generate`                                           | Régénère le client Prisma                                                                  |
| `pnpm db:migrate`                                            | Développement : `prisma migrate dev` (crée le shadow DB et applique/génère les migrations) |
| `pnpm exec prisma migrate deploy` (dans `packages/database`) | CI/production : applique les migrations en attente, sans reset                             |
| `pnpm exec prisma migrate status`                            | Vérifie l'état de l'historique                                                             |
| `pnpm db:studio`                                             | Inspection visuelle                                                                        |

Règles :

- **Ne jamais utiliser `prisma db push` sur Neon** : il peut supprimer des colonnes sans
  migration ni rollback.
- **Ne jamais exécuter `prisma migrate reset`** sur une base non jetable.
- Une migration appliquée est immuable (Prisma vérifie son checksum). Pour corriger,
  créer une nouvelle migration.

## Déploiement standard

Base vierge (CI, environnement de test, nouvelle branche Neon) :

```bash
pnpm install
pnpm db:generate
cd packages/database
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
```

`migrate deploy` applique dans l'ordre toutes les migrations de
`packages/database/prisma/migrations/` et s'arrête à la première erreur. Aucune migration
n'est rejouée si elle figure déjà dans `_prisma_migrations`.

En développement, `pnpm db:migrate` équivaut à `prisma migrate dev` : il génère une
migration si le schéma a changé, l'applique, puis régénère le client. Sur Neon, `migrate dev`
a besoin d'une base shadow (droits de création de base ou `shadowDatabaseUrl` dans le
datasource) ; utiliser une branche de développement, jamais la branche de production.

## Rollback

Prisma n'a pas de migrations « down ». La procédure de retour arrière est :

1. **Avant tout déploiement** : créer un snapshot ou une branche Neon (restauration
   point-in-time).
2. **Échec en cours d'application** : corriger la cause, puis
   `pnpm exec prisma migrate resolve --rolled-back <migration>` pour retirer le verrou
   d'échec, et rejouer `migrate deploy`. Ne pas éditer la migration déjà partiellement
   appliquée.
3. **Retour arrière du schéma** : restaurer la branche/snapshot Neon, ou écrire une
   migration compensatoire. Ne jamais supprimer ni modifier à la main une ligne de
   `_prisma_migrations`.
4. La migration `20261101090000_schema_0_6_0` crée un snapshot des données legacy
   `GameSystem` dans le schéma `legacy_backup` (`legacy_backup."GameSystem_20261101"`).
   Ce schéma est ignoré par `prisma migrate diff`. Après validation, il peut être supprimé
   manuellement avec `DROP SCHEMA legacy_backup CASCADE` (hors migration, pour ne pas
   créer de drift).

## Baseline de la base Neon existante

La base Neon a été créée/modifiée avec `db push` : elle ne contient pas de table
`_prisma_migrations`, alors que ses objets correspondent déjà au schéma courant. Il faut
donc **marquer les migrations comme appliquées sans les exécuter**.

### 1. Sauvegarder

Créer une branche ou un snapshot Neon avant toute opération.

### 2. Vérifier que les objets existent déjà

À exécuter sur Neon (lecture seule). Le résultat doit lister les objets attendus ; si un
objet manque, **ne pas baseliner** : appliquer `prisma migrate deploy` à la place.

```sql
-- Tables attendues
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'User', 'Session', 'Account', 'Verification', 'ApiKey',
    'Campaign', 'CampaignMember', 'JsonTemplate', 'Entity', 'EntityAssignee',
    'EntityLink', 'EntityVersion', 'PlayerChoice', 'ChoiceVote',
    'ChatMessage', 'VttScene', 'CampaignEncounter', 'JournalEntry',
    'AmbiancePlaylist', 'CampaignAmbiance', 'GameSystem', 'Novel', 'Chapter',
    'NovelCollaborator'
  )
ORDER BY table_name;

-- Colonnes ajoutées après la dernière migration historique
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('Campaign', 'description'), ('Campaign', 'visibility'), ('Campaign', 'gameSystemId'),
    ('Entity', 'shareSlug'), ('JsonTemplate', 'customCss'),
    ('GameSystem', 'ownerId'), ('GameSystem', 'defaultTemplates'),
    ('GameSystem', 'defaultAssets'), ('GameSystem', 'defaultLore'),
    ('Novel', 'genre'), ('Novel', 'tags'), ('Novel', 'shareToken'), ('Novel', 'shareMode')
  )
ORDER BY table_name, column_name;

-- L'historique de migrations doit être absent avant la baseline
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = '_prisma_migrations';
```

### 3. Marquer toutes les migrations comme appliquées

Depuis `packages/database`, avec `DATABASE_URL` pointant sur la base Neon :

```bash
for d in $(ls prisma/migrations | grep -E '^[0-9]{14}_' | sort); do
  pnpm exec prisma migrate resolve --applied "$d"
done
```

La dernière itération exécute bien :

```bash
pnpm exec prisma migrate resolve --applied 20261101090000_schema_0_6_0
```

> **Important :** marquer uniquement `20261101090000_schema_0_6_0` ne suffit pas. Les 12
> migrations antérieures resteraient « pending » et le prochain `migrate deploy`
> tenterait de recréer des tables existantes. `migrate resolve` n'exécute aucun SQL : il
> enregistre chaque migration dans `_prisma_migrations` avec son checksum.

### 4. Vérifier

```bash
pnpm exec prisma migrate status
# attendu : « Database schema is up to date! »
```

Ensuite `pnpm db:migrate` doit fonctionner : `prisma migrate dev` ne voit plus de migration
en attente et répond « Already in sync ». Sur Neon, utiliser une branche de développement
(le shadow DB de `migrate dev` ne doit pas être créé sur la branche de production).

## Validation reproductible de l'historique

Sur une base PostgreSQL jetable (Docker ou instance locale isolée), sans jamais viser Neon :

```bash
cd packages/database
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/DB_JETABLE'
pnpm exec prisma migrate deploy
pnpm exec prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

Sortie attendue : `-- This is an empty migration.` (zéro drift).

## Règle expand / contract (migrations sûres en production)

Une migration s'applique avant que le nouveau code ne soit servi (le front et le serveur
Vercel se déploient séparément). Elle doit donc rester compatible avec le code qui tourne
encore :

1. **Expand** — ajouter : table, colonne nullable ou avec défaut, index. L'ancien code
   continue de fonctionner.
2. **Migrer** — déployer le code qui lit et écrit la nouvelle structure.
3. **Contract** — supprimer l'ancienne colonne ou table dans un déploiement ultérieur,
   quand plus aucun code ne l'utilise.

Motifs interdits dans une migration appliquée en une étape : `DROP TABLE`, `DROP COLUMN`,
`DROP SCHEMA`, `DROP TYPE`, `TRUNCATE`, `DELETE FROM`, `RENAME`, `ALTER COLUMN … TYPE`.
Un renommage se fait par ajout de la nouvelle colonne, copie, double écriture, puis
suppression de l'ancienne.

Contrôle automatique : `node scripts/check-migrations.mjs --base <ref>` lit les
`migration.sql` ajoutés ou modifiés entre `<ref>` et HEAD et échoue si un motif destructif
est présent. La CI l'exécute sur chaque push et pull request (job `check`). `--all` audite
l'historique complet, à titre informatif.

## Branche de sauvegarde avant toute migration

La base de production et la base locale ne font qu'une (voir « Base partagée » ci-dessous).
Avant toute migration ou opération sensible :

1. Créer une branche Neon à partir de la branche racine de production, depuis la console
   Neon (Vercel → Storage → store `aetheris` → Open in Neon) ou avec la CLI Neon.
2. Ne jamais copier l'URL de cette branche dans `.env` : la passer uniquement à la
   commande, par exemple
   `DATABASE_URL='postgresql://…' pnpm exec prisma migrate status`.
3. Vérifier `prisma migrate status` sur la branche avant et après l'opération.
4. Conserver la branche jusqu'à validation du déploiement, puis la supprimer.

Restauration :

- **Instant restore (branche racine)** : console Neon → branche → _Backup & Restore_ →
  _Restore from history_ → timestamp ou LSN. L'opération écrase la branche ; Neon crée
  automatiquement une copie `{branche}_old_{timestamp}`. Les branches enfants ne sont pas
  éligibles à l'instant restore ; on les réinitialise depuis leur parent.
- **Depuis une branche de sauvegarde** : _Restore from another branch_, ou
  `neon branches restore <cible> <source>@<timestamp>`.
- Prisma n'a pas de migration « down » : restaurer la branche est la seule marche arrière
  fiable après une migration destructive.

Fenêtre d'historique Neon (documentation consultée le 2026-11-01, page _History window_) :

| Plan   | Fenêtre par défaut      | Maximum  |
| ------ | ----------------------- | -------- |
| Free   | 6 h (1 Go d'historique) | 6 h      |
| Launch | 1 jour                  | 7 jours  |
| Scale  | 1 jour                  | 30 jours |

La fenêtre est configurable dans Console → Settings → Postgres
(`history_retention_seconds`) et s'applique à toutes les branches du projet. **Le plan
réel de ce projet n'a pas été vérifié ici** : le contrôle se fait dans cette même page
avant de compter sur un retour arrière. Pour l'alpha, viser au moins 7 jours (Launch).

## Base partagée local / production (état actuel)

Choix assumé : le poste de développement, la préversion Vercel et la production utilisent
la même base Neon (store `aetheris`, lié aux environnements `preview` et `production`).
Les E2E et les commandes locales écrivent donc dans les données réelles.

Garde-fous :

- `pnpm db:push`, `pnpm db:reset` et `pnpm db:migrate` passent par
  `packages/database/scripts/db-guard.mjs` : un hôte local est accepté sans confirmation,
  un hôte distant exige `AETHERIS_DB_CONFIRM=<hostname>`.
- `--accept-data-loss` est refusé sauf `AETHERIS_ALLOW_DATA_LOSS=written-approval`.
- Les données E2E utilisent le domaine `@e2e.aetheris.test` (et l'ancien préfixe
  `e2e-…@example.com`) avec un titre préfixé `[E2E]`.
  `packages/database/scripts/cleanup-e2e.mjs` les liste en lecture seule ; il ne supprime
  qu'avec `--confirm` **et** `AETHERIS_CLEANUP_CONFIRM=yes`, et jamais une campagne
  comptant un membre non marqué.
- La CI utilise son propre PostgreSQL de service, jamais la base Neon.

## Quand séparer les environnements

À faire dès que des testeurs créent des données auxquelles ils tiennent (romans,
campagnes en cours) : la base partagée n'est tolérable que tant que ces données sont
sacrifiables.

Procédure préparée, non exécutée :

1. Créer une branche Neon par environnement (`preview`, `staging`) à partir de la prod.
2. Dans Vercel, donner à chaque environnement sa propre `DATABASE_URL` (Preview ≠
   Production) et vérifier que chaque service lit celle de son environnement.
3. Appliquer `prisma migrate deploy` sur chaque branche, puis semer les données de démo.
4. Garder la production sur sa branche racine ; les tests manuels et les E2E visent la
   branche de préversion.
5. Pour les E2E destructifs, préférer une branche jetable recréée depuis la préversion
   plutôt qu'un nettoyage a posteriori.
