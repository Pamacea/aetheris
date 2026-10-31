import { entityTokenPatch } from "@aetheris/shared";
import type { SceneToken } from "@aetheris/shared";
import type { VttEntity } from "./types";

/**
 * Ré-export du mapping fiche ↔ token partagé (packages/shared) : le web et
 * le serveur Nest résolvent les mêmes clés.
 */
export {
  combatEntityData,
  entityCombatValues,
  entityName,
  entityTokenPatch,
  resolveCombatKeys,
} from "@aetheris/shared";

/** Alias historique conservé pour les appelants web. */
export { entityCombatValues as entityCombat } from "@aetheris/shared";

/**
 * Rejoue la fiche liée sur des jetons (chargement initial ET `scene:state`).
 * `previous` = jetons déjà affichés : à `noteId` identique, leurs valeurs de
 * fiche sont au moins aussi fraîches que la copie `entities` du rendu (mise à
 * jour par `fiche:combat`) — on les conserve pour ne pas dépendre de l'ordre
 * des événements `scene:state` / `fiche:combat`.
 */
export function hydrateTokens<T extends SceneToken>(
  tokens: T[],
  entities: VttEntity[],
  previous: readonly SceneToken[] = [],
): T[] {
  const entitiesById = new Map(entities.map((e) => [e.id, e]));
  const previousById = new Map(previous.map((t) => [t.id, t]));
  return tokens.map((token) => {
    const entity = token.noteId ? entitiesById.get(token.noteId) : undefined;
    if (!entity) return token;
    const patch = entityTokenPatch(entity, entity.schema);
    const local = previousById.get(token.id);
    if (local && local.noteId === token.noteId) {
      patch.name = local.name;
      if (local.hp !== null) patch.hp = local.hp;
      if (local.hpMax !== null) patch.hpMax = local.hpMax;
      if (local.ac !== null) patch.ac = local.ac;
    }
    return { ...token, ...patch };
  });
}
