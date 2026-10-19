"use client";

import type { CombatState } from "@aetheris/shared";

/** Liste d'initiative : combattants, PV (MJ), tour actif. */
export function CombatList({
  state,
  isGM,
  changeHp,
  removeCombatant,
}: {
  state: CombatState;
  isGM: boolean;
  changeHp: (id: string, delta: number) => void;
  removeCombatant: (id: string) => void;
}) {
  if (state.combatants.length === 0) {
    return (
      <p className="panel px-4 py-8 text-center text-sm text-muted">
        Aucun combattant —{" "}
        {isGM
          ? "ajoutez des participants puis jetez l'initiative."
          : "le MJ n'a pas encore lancé le combat."}
      </p>
    );
  }

  return (
    <ul className="panel divide-y divide-border">
      {state.combatants.map((c, i) => {
        const isActive = state.active && i === state.activeIndex;
        return (
          <li
            key={c.id}
            className={`flex flex-wrap items-center gap-3 px-3 py-2 ${isActive ? "bg-accent/10" : ""}`}
          >
            <span
              className={`w-8 border text-center text-sm ${
                isActive ? "border-accent text-accent" : "border-border text-muted"
              }`}
            >
              {c.initiative}
            </span>
            <span className="flex-1 text-sm font-medium">
              {c.name}
              {isActive && (
                <span className="ml-2 text-[0.65rem] tracking-widest text-accent uppercase">
                  ▸ au tour
                </span>
              )}
            </span>
            {c.hp !== null && (
              <span className="flex items-center gap-1 text-xs text-muted">
                {isGM && (
                  <button
                    type="button"
                    className="btn border-transparent px-1.5 py-1 text-xs"
                    onClick={() => changeHp(c.id, -1)}
                    aria-label={`Retirer 1 PV à ${c.name}`}
                  >
                    −
                  </button>
                )}
                <span className="w-16 text-center">
                  {c.hp}
                  {c.hpMax !== null && ` / ${c.hpMax}`}
                </span>
                {isGM && (
                  <button
                    type="button"
                    className="btn border-transparent px-1.5 py-1 text-xs"
                    onClick={() => changeHp(c.id, 1)}
                    aria-label={`Ajouter 1 PV à ${c.name}`}
                  >
                    +
                  </button>
                )}
              </span>
            )}
            {isGM && (
              <button
                type="button"
                className="btn border-transparent px-2 py-1 text-xs text-muted hover:text-destructive"
                onClick={() => removeCombatant(c.id)}
                aria-label={`Retirer ${c.name}`}
              >
                ✕
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
