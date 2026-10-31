import { fieldWidthSpan, type TemplateField } from "@aetheris/shared";
import type { DiceRollDisplay, DiceRollError } from "@/lib/use-dice-roll";

const WIDTH_SPAN_CLASS: Record<3 | 4 | 6 | 9 | 12, string> = {
  3: "col-span-1 min-w-0 sm:col-span-3",
  4: "col-span-1 min-w-0 sm:col-span-4",
  6: "col-span-1 min-w-0 sm:col-span-6",
  9: "col-span-1 min-w-0 sm:col-span-9",
  12: "col-span-1 min-w-0 sm:col-span-12",
};

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
  // Largeur sur la grille 12 colonnes (⚙ builder) ; nombre/compteur courts
  // par défaut (démarche « champs plus petits »).
  const widthCls = WIDTH_SPAN_CLASS[fieldWidthSpan(field.width, field.kind)];
  const sizeCls = field.size === "sm" ? "input-sm" : "";
  const label = (
    <span
      className="min-w-0 shrink-0 truncate text-[0.65rem] tracking-widest text-muted uppercase"
      title={field.label}
    >
      {field.label}
      {field.kind === "formula" ? (
        <span className="ml-1 normal-case">(calcul)</span>
      ) : field.kind === "number" && field.unit ? (
        <span className="ml-1 normal-case">({field.unit})</span>
      ) : null}
    </span>
  );
  const help = field.help ? (
    <span className="shrink-0 text-[0.65rem] text-muted">{field.help}</span>
  ) : null;

  // Champ « dé » : expression de jet optionnelle (number/counter/formula).
  const rollExpr =
    (field.kind === "number" || field.kind === "counter" || field.kind === "formula") && field.roll
      ? field.roll
      : null;
  const labelRow = rollExpr ? (
    <span className="flex shrink-0 items-center justify-between gap-2">
      {label}
      <button
        type="button"
        className="btn shrink-0 px-1.5 py-0.5 text-xs"
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
