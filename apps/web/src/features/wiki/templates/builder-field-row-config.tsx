import type { TemplateField, TemplateFieldKind } from "@aetheris/shared";
import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import { KIND_LABELS, makeField } from "./builder-field-factory";
import { FieldConfigBasics } from "./builder-field-config-basics";
import { FieldConfigChoice } from "./builder-field-config-choice";
import { FieldConfigNumber } from "./builder-field-config-number";
import { FieldConfigExtra } from "./builder-field-config-extra";
import { FieldConfigCode } from "./builder-field-config-code";

interface Props {
  st: BuilderState;
  ops: FieldOps;
  field: TemplateField;
  index: number;
}

/** Ligne 2 d'un champ : type + configuration spécifique au type. */
export function FieldRowConfig({ st, ops, field, index }: Props) {
  const i = index;
  const { openCfg, campaignId, jsTest, setJsTest } = st;
  const { patchField } = ops;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-0.5">
        <span className="text-[0.6rem] tracking-widest text-muted uppercase">Type</span>
        <select
          className="input w-36 py-1 text-xs"
          name={`champ-${field.id}-type`}
          value={field.kind}
          onChange={(e) => {
            const kind = e.target.value as TemplateFieldKind;
            patchField(i, (f) => makeField(kind, f.id, f.label));
          }}
        >
          {(Object.keys(KIND_LABELS) as TemplateFieldKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      {openCfg.has(i) && (
        <>
          <FieldConfigBasics field={field} index={i} patchField={patchField} />
          <FieldConfigChoice
            field={field}
            index={i}
            patchField={patchField}
            campaignId={campaignId}
          />
          <FieldConfigNumber field={field} index={i} patchField={patchField} />
          <FieldConfigExtra field={field} index={i} patchField={patchField} />
          <FieldConfigCode
            field={field}
            index={i}
            patchField={patchField}
            jsTest={jsTest}
            setJsTest={setJsTest}
          />
        </>
      )}
    </div>
  );
}
