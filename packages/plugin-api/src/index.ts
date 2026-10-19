/**
 * API publique des plugins Aetheris (`@aetheris/plugin-api`).
 * Types de référence pour écrire un plugin — guide : README.md.
 * Zéro dépendance : pur types, utilisable côté serveur et navigateur.
 */

/**
 * Manifeste public d'un plugin, déclaré au registre NestJS via
 * `@RegisterPlugin(manifest, loader?)` (`apps/server/src/core/plugins`).
 * Le registre exige au minimum `id` + `name` ; les champs optionnels
 * ci-dessous documentent le contrat étendu pour les outils (/builder, docs).
 */
export interface PluginManifest {
  /** Stable — kebab-case ; valeur stockée dans `Campaign.enabledPlugins`. */
  id: string;
  /** Affiché dans `/builder` et sur le hub campagne. */
  name: string;
  /** Description courte (catalogue). */
  description?: string;
  /** Version sémantique du plugin, indépendante de la version de l'app. */
  version: string;
  /**
   * Hooks supportés, au format `objet:action` (ex. `campaign:exported`).
   * Déclaratifs : le registre les expose dans la liste des capacités ;
   * l'exécution des hooks sera câblée par le core (aucun hook exécuté
   * aujourd'hui — ne pas en promettre plus dans l'UI).
   */
  hooks?: readonly string[];
  /**
   * Types d'événements temps réel supportés, relayés dans la room
   * campagne via l'événement WS `plugin:event` — formats réels :
   * `initiative:committed`, `audio:state` (schémas Zod : `@aetheris/shared`
   * `pluginEventSchema` / `pluginEventRequestSchema`).
   */
  events?: readonly PluginEventType[];
}

/** Type d'événement plugin : `namespace:action` (ex. `initiative:committed`). */
export type PluginEventType = `${string}:${string}`;
