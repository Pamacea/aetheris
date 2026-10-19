import { z } from "zod";

/**
 * Module Combat & Initiative (Phase 8).
 * État complet commité par le MJ, relayé via le relais générique
 * `plugin:event` (type `combat:state`) et persisté par campagne.
 */

export const combatantSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  initiative: z.number().int().min(-20).max(999),
  hp: z.number().nullable(),
  hpMax: z.number().nullable(),
  isPC: z.boolean(),
});
export type Combatant = z.infer<typeof combatantSchema>;

export const combatStateSchema = z.object({
  combatants: z.array(combatantSchema).max(50),
  /** Index du combattant dont c'est le tour (dans le tableau trié). */
  activeIndex: z.number().int().min(0).max(49),
  round: z.number().int().min(1).max(9999),
  active: z.boolean(),
});
export type CombatState = z.infer<typeof combatStateSchema>;

/** État vide par défaut (aucun combat lancé). */
export const EMPTY_COMBAT_STATE: CombatState = {
  combatants: [],
  activeIndex: 0,
  round: 1,
  active: false,
};

/** Type d'événement WS du relais générique pour ce module. */
export const COMBAT_STATE_EVENT = "combat:state";
