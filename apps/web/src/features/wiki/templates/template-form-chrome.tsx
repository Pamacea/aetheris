import type { TemplateField } from "@aetheris/shared";
import type { DiceRollDisplay, DiceRollError } from "@/lib/use-dice-roll";

export type FieldDice = {
  roll: (expression: string, scope: Record<string, unknown>, fieldId: string) => void;
  last: DiceRollDisplay | null;
  error: DiceRollError | null;
};

/** Libellé / aide / classes de grille + libellé et retour de jet optionnels. */
export type FieldChrome = {
  label: React.ReactNode;
  labelRow: React.ReactNode;
  rollFeedback: React.ReactNode;
  help: React.ReactNode;
  widthCls: string;
  sizeCls: string;
};

/** Chrome partagé de tous les champs (libellé, aide, largeur, jet « dé »). */
export function fieldChrome(
  field: TemplateField,
  dice: FieldDice,
  numericScope: Record<string, number>,
): FieldChrome {
  const { roll, last, error } = dice;
  // Longueur/taille configurables (⚙ builder) ; nombre/compteur courts
  // par défaut (démarche « champs plus petits »).
  // shortcut: clamp via w-[min()] — les classes max-w-* sont interdites (PARRY).
  const widthCls =
    field.width === "full"
      ? ""
      : field.width === "md"
        ? "w-[min(100%,18rem)]"
        : field.width === "sm" || field.kind === "number" || field.kind === "counter"
          ? "w-[min(100%,11rem)]"
          : "";
  const sizeCls = field.size === "sm" ? "input-sm" : "";
  const label = (
    <span className="text-[0.65rem] tracking-widest text-muted uppercase">
      {field.label}
      {field.kind === "formula" || field.kind === "number" ? (
        <span className="ml-1 normal-case">
          ({field.kind === "formula" ? "calcul" : field.unit || "nombre"})
        </span>
      ) : null}
    </span>
  );
  const help = field.help ? <span className="text-[0.65rem] text-muted">{field.help}</span> : null;

  // Champ « dé » : expression de jet optionnelle (number/counter/formula).
  const rollExpr =
    (field.kind === "number" || field.kind === "counter" || field.kind === "formula") && field.roll
      ? field.roll
      : null;
  const labelRow = rollExpr ? (
    <span className="flex items-center justify-between gap-2">
      {label}
      <button
        type="button"
        className="btn px-1.5 py-0.5 text-xs"
        aria-label={`Lancer ${field.label}`}
        title={rollExpr}
        onClick={() => roll(rollExpr, numericScope, field.id)}
      >
        ⚄
      </button>
    </span>
  ) : (
    label
  );
  // Résultat / erreur affichés sous le champ (un seul jet actif à la fois).
  const rollFeedback = rollExpr ? (
    <>
      {error && error.fieldId === field.id && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
      {last && last.fieldId === field.id && (
        <p className="font-mono text-xs text-accent">
          {last.total}
          {last.results.length > 0 && (
            <span className="text-muted"> ({last.results.join(" + ")})</span>
          )}
        </p>
      )}
    </>
  ) : null;

  return { label, labelRow, rollFeedback, help, widthCls, sizeCls };
}
