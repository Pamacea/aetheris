import type { NoteBlock } from "@aetheris/shared";
import type { DiceRollDisplay, DiceRollError } from "@/lib/use-dice-roll";
import type { ScopeOf } from "./blocks-scopes";

/** Jets des blocs : affichage du résultat et lancement via la portée macro. */
export function createRollHelpers({
  roll,
  last,
  error,
  scopeOf,
}: {
  roll: (expression: string, scope: Record<string, unknown>, fieldId: string) => void;
  last: DiceRollDisplay | null;
  error: DiceRollError | null;
  scopeOf: ScopeOf;
}) {
  /** Jet du bloc : résultat ou erreur rattachés à `block:<id>`. */
  function rollResult(b: NoteBlock) {
    const fieldId = `block:${b.id}`;
    if (last?.fieldId === fieldId) {
      return (
        <p className="font-mono text-xs text-accent">
          {last.total} ({last.results.join(" + ")})
        </p>
      );
    }
    if (error?.fieldId === fieldId) {
      return <p className="text-xs text-destructive">{error.message}</p>;
    }
    return null;
  }

  function rollBlock(b: NoteBlock) {
    const scope = scopeOf(b);
    if (!b.roll || !scope) return;
    roll(b.roll, scope, `block:${b.id}`);
  }

  return { rollResult, rollBlock };
}
