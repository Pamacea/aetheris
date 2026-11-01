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
