# @aetheris/plugin-api

Types publics des plugins Aetheris (Phase 10 — documentation interne de
l'API plugin). Package workspace **sans dépendance** : pur TypeScript,
utilisable par le serveur NestJS, le web Next.js et tout outil externe.

```bash
# depuis un autre package du workspace
pnpm add @aetheris/plugin-api --workspace
```

```ts
import type { PluginManifest, PluginEventType } from "@aetheris/plugin-api";
```

## `PluginManifest`

Champ déclaré par chaque plugin au registre (`@RegisterPlugin`) :

| Champ         | Type                         | Obligatoire | Rôle                                                                                         |
| ------------- | ---------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `id`          | `string` (kebab-case)        | oui         | Identifiant stable — valeur stockée dans `Campaign.enabledPlugins`, garde-fou `PluginGuard`. |
| `name`        | `string`                     | oui         | Libellé affiché dans `/builder` et sur le hub campagne.                                      |
| `description` | `string`                     | non         | Description courte du catalogue.                                                             |
| `version`     | `string` (sémantique)        | oui*        | Version du plugin, indépendante de l'app.                                                    |
| `hooks`       | `readonly string[]`          | non         | Hooks supportés, format `objet:action` (ex. `campaign:exported`).                            |
| `events`      | `readonly PluginEventType[]` | non         | Événements WS émis/écoutés via le relais `plugin:event`.                                     |

\* Le registre NestJS actuel (`apps/server/src/core/plugins`) n'exige que
`id` + `name` (+ `description` optionnel) ; `version`/`hooks`/`events`
sont le contrat étendu documenté ici — un manifeste fourni par le core
reste compatible (sous-ensemble structurel).

`PluginEventType` = `` `${string}:${string}` `` — ex. `initiative:committed`,
`audio:state`.

## Vie d'un plugin

1. **Déclaration** — décorateur `@RegisterPlugin(manifest, loader?)` sur le
   provider : le manifeste entre dans la map du registre ; le `loader`
   (import dynamique) n'est appelé qu'au premier usage
   (`PluginRegistryService.loadService`).
2. **Activation par campagne** — le MJ active le plugin dans `/builder` :
   son `id` est ajouté à `Campaign.enabledPlugins` (server action
   `setCampaignPlugin`, réservée aux MJ).
3. **Garde HTTP** — toute route marquée `@RequiresPlugin(id)` passe par
   `PluginGuard` : plugin enregistré ? utilisateur membre de la campagne ?
   plugin activé ? Sinon `403`.
4. **Événements temps réel** — relais générique dans la room campagne :
   - C→S `plugin:event` — payload `pluginEventRequestSchema`
     (`campaignId`, `pluginId`, `type`, `payload`) ;
   - S→C `plugin:event` — payload `pluginEventSchema`
     (`pluginId`, `type`, `payload`, `fromName`).
     Le serveur ne relaye que si le plugin est activé pour la campagne.
     Contrats Zod dans `@aetheris/shared` (`schemas/plugins.ts`).

## Exemple

```ts
import type { PluginManifest } from "@aetheris/plugin-api";

export const MANIFEST: PluginManifest = {
  id: "combat",
  name: "Combat & Initiative",
  description: "Tracker de tour, initiative, round — sync temps réel",
  version: "1.0.0",
  hooks: ["campaign:exported"],
  events: ["initiative:committed"],
};
```

## Limites connues (état du code)

- Les `hooks` sont **exécutés** : le core dispatch (`PluginRegistryService.dispatchHook`,
  format `objet:action`) vers les plugins qui le déclarent au manifeste ET sont
  activés pour la campagne ; handler = provider `PLUGIN_HOOK_HANDLER` du module
  lazy. Erreurs de handler loggées, jamais propagées au core.
- `apps/server/src/core/plugins/register-plugin.decorator.ts` déclare son
  propre `PluginManifest` local (sous-ensemble `id`/`name`/`description`/`hooks`) :
  la migration de ce fichier vers ce package est à faire quand le serveur
  pourra dépendre d'`@aetheris/plugin-api` sans risque de build.
- Le catalogue d'activation côté web reste `PLUGIN_CATALOG` dans
  `@aetheris/shared` (les ids des deux listes doivent rester alignés).
