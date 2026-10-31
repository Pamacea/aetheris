import type { TemplateField } from "@aetheris/shared";
import type { FieldDice } from "./template-form-chrome";
import { TemplateField as TemplateFieldControl } from "./template-form-field";

const STUB_DICE: FieldDice = { roll: () => {}, last: null, error: null };
const noop = () => {};

/** Aperçu réel (non interactif) du contrôle rendu dans la fiche. */
export function FieldPreview({ field }: { field: TemplateField }) {
  const defaultValue = "default" in field ? field.default : undefined;
  // Le libellé éditable de la carte est l'unique libellé : l'aperçu ne montre
  // que le contrôle (input, stepper, select…).
  const previewField = { ...field, label: "", help: "" };
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-sm border border-border/40 bg-background/30 px-1.5 py-1">
      <span className="block text-[0.55rem] text-muted">Aperçu</span>
      <div
        inert
        className="pointer-events-none max-h-20 select-none overflow-hidden opacity-70"
        style={{
          maskImage: "linear-gradient(to bottom, #000 82%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 82%, transparent)",
        }}
      >
        <TemplateFieldControl
          field={previewField}
          value={defaultValue}
          setValue={noop}
          notes={[]}
          linked={{}}
          categoryOf={() => null}
          numericScope={{}}
          jsScope={{}}
          onNavigate={noop}
          dice={STUB_DICE}
        />
      </div>
    </div>
  );
}
