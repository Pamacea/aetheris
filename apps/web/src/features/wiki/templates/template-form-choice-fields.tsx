import type { FieldProps } from "./template-form-field";

/** Choix multiples : select (statique / notes / libre) et cases à cocher. */

export function SelectField({ field, value, chrome, rt }: FieldProps<"select">) {
  const selected = field.options.find((o) => o.value === value);
  const isWiki = field.source === "wiki";
  // Source notes : options = titres de la campagne (id stocké, comme tag).
  const candidates = isWiki
    ? rt.notes.filter((n) => !field.targetCategory || rt.categoryOf(n) === field.targetCategory)
    : [];
  return (
    <label className={`flex flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.label}
      <span
        className="flex items-center gap-2"
        onDragOver={isWiki ? rt.noteOver : undefined}
        onDrop={
          isWiki
            ? (e) => {
                const n = rt.notePayload(e);
                if (!n || !candidates.some((c) => c.id === n.id)) return;
                e.preventDefault();
                rt.setValue(field.id, n.id);
              }
            : undefined
        }
      >
        {isWiki ? (
          <select
            className={`input ${chrome.sizeCls}`}
            name={field.id}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => rt.setValue(field.id, e.target.value === "" ? null : e.target.value)}
          >
            <option value="">—</option>
            {candidates.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        ) : field.free ? (
          // Champ libre : combobox native (valeur arbitraire + suggestions).
          <input
            className={`input ${chrome.sizeCls}`}
            name={field.id}
            list={`opts-${field.id}`}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => rt.setValue(field.id, e.target.value || null)}
          />
        ) : (
          <select
            className={`input ${chrome.sizeCls}`}
            name={field.id}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => rt.setValue(field.id, e.target.value === "" ? null : e.target.value)}
          >
            <option value="">—</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        {field.free && (
          <datalist id={`opts-${field.id}`}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </datalist>
        )}
        {selected?.color && (
          <span
            aria-hidden
            className="inline-block h-3 w-3 shrink-0"
            style={{ background: selected.color }}
          />
        )}
      </span>
      {chrome.help}
    </label>
  );
}

export function MultiSelectField({ field, value, chrome, rt }: FieldProps<"multiSelect">) {
  const picked = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (v: string) =>
    rt.setValue(field.id, picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v]);
  const opts =
    field.source === "wiki"
      ? rt.notes
          .filter((n) => !field.targetCategory || rt.categoryOf(n) === field.targetCategory)
          .map((n) => ({ value: n.id, label: n.title, color: undefined }))
      : field.options;
  // Valeurs hors liste (champ libre / notes supprimées) : affichées telles quelles.
  const extras = picked
    .filter((v) => !opts.some((o) => o.value === v))
    .map((v) => ({ value: v, label: v, color: undefined }));
  return (
    <div className={`flex flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.label}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {[...opts, ...extras].map((o) => (
          <label key={o.value} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[var(--accent)]"
              name={field.id}
              checked={picked.includes(o.value)}
              onChange={() => toggle(o.value)}
            />
            <span>{o.label}</span>
            {o.color && (
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5"
                style={{ background: o.color }}
              />
            )}
          </label>
        ))}
        {opts.length === 0 && extras.length === 0 && (
          <span className="text-xs text-muted">Aucune option.</span>
        )}
      </div>
      {chrome.help}
    </div>
  );
}
