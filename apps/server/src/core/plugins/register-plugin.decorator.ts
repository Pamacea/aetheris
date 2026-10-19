import type { DynamicModule, Type } from "@nestjs/common";

export interface PluginManifest {
  /** Identifiant stable — valeur de `Campaign.enabledPlugins`. */
  id: string;
  name: string;
  description?: string;
  /** Hooks supportés, format `objet:action` (ex. `chat:message`). */
  hooks?: readonly string[];
}

/** Provider qu'un module plugin expose pour recevoir les hooks du core. */
export interface PluginHookHandler {
  onHook(event: string, data: { campaignId: string; payload: unknown }): void | Promise<void>;
}

/** Token d'injection du handler — le module plugin le fournit (`useExisting`). */
export const PLUGIN_HOOK_HANDLER: unique symbol = Symbol("aetheris:plugin-hook-handler");

/** Loader lazy : retourne le module NestJS du plugin au premier usage. */
export type PluginLoader = () =>
  | Promise<Type<unknown> | DynamicModule>
  | Type<unknown>
  | DynamicModule;

interface PluginRegistration {
  manifest: PluginManifest;
  loader?: PluginLoader;
}

const registrations = new Map<string, PluginRegistration>();

/**
 * Décorateur `@RegisterPlugin(manifest, loader?)` :
 * déclare un plugin au registre. `loader` permet de charger le module du
 * plugin à la demande (LazyModuleLoader) — le code du plugin ne s'exécute
 * que si un plugin est sollicité.
 */
export function RegisterPlugin(manifest: PluginManifest, loader?: PluginLoader) {
  return <T extends Type>(target: T): T => {
    if (registrations.has(manifest.id)) {
      throw new Error(`Plugin déjà enregistré : ${manifest.id}`);
    }
    registrations.set(manifest.id, { manifest, loader });
    return target;
  };
}

export function getPluginRegistrations(): ReadonlyMap<string, PluginRegistration> {
  return registrations;
}
