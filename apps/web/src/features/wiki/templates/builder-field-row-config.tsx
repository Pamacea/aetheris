import type { TemplateField, TemplateFieldKind } from "@aetheris/shared";
import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import { FIELD_ID_RE, KIND_LABELS, makeField } from "./builder-field-factory";
import { FieldConfigBasics } from "./builder-field-config-basics";
import { FieldConfigChoice } from "./builder-field-config-choice";
import { FieldConfigNumber } from "./builder-field-config-number";
import { FieldConfigExtra } from "./builder-field-config-extra";
import { FieldConfigCode } from "./builder-field-config-code";
import { FieldRowEditors } from "./builder-field-row-editors";

interface Props {
  st: BuilderState;
  ops: FieldOps;
  field: TemplateField;
  index: number;
}

const SECTION = "text-[0.6rem] font-semibold tracking-widest text-muted uppercase";

/** Panneau de configuration d'un champ, compact : Général / Options / Avancé. */
export function FieldRowConfig({ st, ops, field, index }: Props) {
  const i = index;
  const { campaignId, jsTest, setJsTest } = st;
  const { patchField } = ops;
  const idValid = FIELD_ID_RE.test(field.id);

  return (
    <div className="flex flex-col gap-3" data-field-config>
      <section className="flex flex-col gap-1.5">
        <p className={SECTION}>Général</p>
        <label className="flex min-h-7 items-center justify-between gap-2">
          <span className="shrink-0 text-[0.6rem] tracking-widest text-muted uppercase">Type</span>
          <select
            className="input h-7 w-40 min-w-0 px-2 py-0 text-xs"
            name={`champ-${field.id}-type`}
            value={field.kind}
            onChange={(e) => {
              const kind = e.target.value as TemplateFieldKind;
              // Le type ne définit pas la position : on conserve le layout du canvas.
              patchField(i, (f) => ({
                ...makeField(kind, f.id, f.label),
                ...(f.layout ? { layout: f.layout } : {}),
              }));
            }}
          >
            {/* « css » reste lisible pour les schémas hérités, mais n'est plus
                créable : le CSS passe par la modale STYLE. */}
            {(Object.keys(KIND_LABELS) as TemplateFieldKind[])
              .filter((k) => k !== "css")
              .map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
          </select>
        </label>
        <FieldConfigBasics field={field} index={i} patchField={patchField} />
      </section>

      <section className="flex flex-col gap-1.5">
        <p className={SECTION}>Options</p>
        <FieldConfigChoice
          field={field}
          index={i}
          patchField={patchField}
          campaignId={campaignId}
        />
        <FieldConfigNumber field={field} index={i} patchField={patchField} />
        <FieldConfigExtra field={field} index={i} patchField={patchField} />
        <FieldRowEditors st={st} ops={ops} field={field} index={i} />
      </section>

      <section className="flex flex-col gap-1.5">
        <p className={SECTION}>Avancé</p>
        <label className="flex min-h-7 items-center justify-between gap-2">
          <span className="shrink-0 text-[0.6rem] tracking-widest text-muted uppercase">
            Identifiant
          </span>
          <input
            className={`input h-7 w-40 min-w-0 px-2 py-0 font-mono text-xs ${
              idValid ? "" : "border-destructive"
            }`}
            name={`champ-${field.id}-identifiant`}
            value={field.id}
            onChange={(e) => patchField(i, (f) => ({ ...f, id: e.target.value }))}
          />
        </label>
        <span
          className={`text-[0.6rem] leading-tight ${idValid ? "text-muted" : "text-destructive"}`}
        >
          minuscules, chiffres, - ou _ ; sert aux formules et à la synchro VTT
        </span>
        <FieldConfigCode
          field={field}
          fields={st.fields}
          index={i}
          patchField={patchField}
          jsTest={jsTest}
          setJsTest={setJsTest}
        />
      </section>
    </div>
  );
}
