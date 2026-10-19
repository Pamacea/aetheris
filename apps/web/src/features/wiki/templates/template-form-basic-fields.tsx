import type { FieldProps } from "./template-form-field";

/** Champs simples : texte, zone de texte, toggle, CSS, image, tag. */
export function TextField({ field, value, chrome, rt }: FieldProps<"text">) {
  return (
    <label
      className={`flex flex-col gap-1 ${chrome.widthCls}`}
      onDragOver={rt.noteOver}
      onDrop={(e) => rt.dropLink(e, field.id, typeof value === "string" ? value : "")}
    >
      {chrome.label}
      <input
        className={`input ${chrome.sizeCls}`}
        name={field.id}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => rt.setValue(field.id, e.target.value)}
      />
      {chrome.help}
    </label>
  );
}

export function TextareaField({ field, value, chrome, rt }: FieldProps<"textarea">) {
  return (
    <label
      className={`flex flex-col gap-1 md:col-span-2 ${chrome.widthCls}`}
      onDragOver={rt.noteOver}
      onDrop={(e) => rt.dropLink(e, field.id, typeof value === "string" ? value : "")}
    >
      {chrome.label}
      <textarea
        className={`input min-h-20 ${chrome.sizeCls}`}
        name={field.id}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => rt.setValue(field.id, e.target.value)}
      />
      {chrome.help}
    </label>
  );
}

export function ToggleField({ field, value, chrome, rt }: FieldProps<"toggle">) {
  return (
    <label className="flex items-center gap-2 self-end pb-1">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[var(--accent)]"
        name={field.id}
        checked={value === true}
        onChange={(e) => rt.setValue(field.id, e.target.checked)}
      />
      <span className="text-sm">{field.label}</span>
      {chrome.help}
    </label>
  );
}

export function CssField({ field, value, chrome, rt }: FieldProps<"css">) {
  const css = typeof value === "string" ? value : "";
  return (
    <div className={`flex flex-col gap-1 md:col-span-2 ${chrome.widthCls}`}>
      {chrome.label}
      <textarea
        className="input min-h-20 py-2 font-mono text-xs"
        name={field.id}
        spellCheck={false}
        value={css}
        placeholder="Ex. .template-form { border: 1px solid crimson; }"
        onChange={(e) => rt.setValue(field.id, e.target.value)}
      />
      {chrome.help}
    </div>
  );
}

export function ImageField({ field, value, chrome, rt }: FieldProps<"image">) {
  const url = typeof value === "string" ? value : "";
  return (
    <div className={`flex flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.label}
      <input
        className={`input ${chrome.sizeCls}`}
        name={field.id}
        type="url"
        placeholder="https://…"
        value={url}
        onChange={(e) => rt.setValue(field.id, e.target.value)}
      />
      {url && (
        <img
          key={url}
          src={url}
          alt=""
          className="border border-border object-contain"
          style={{ maxHeight: field.height ?? 192 }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
      {chrome.help}
    </div>
  );
}

export function TagField({ field, value, chrome, rt }: FieldProps<"tag">) {
  const candidates = rt.notes.filter((n) => {
    if (!field.targetCategory) return true;
    return rt.categoryOf(n) === field.targetCategory;
  });
  return (
    <label className={`flex flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.label}
      <span
        className="flex items-center gap-2"
        onDragOver={rt.noteOver}
        onDrop={(e) => {
          const n = rt.notePayload(e);
          if (!n || !candidates.some((c) => c.id === n.id)) return;
          e.preventDefault();
          rt.setValue(field.id, n.id);
        }}
      >
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
        {typeof value === "string" && value && (
          <button
            type="button"
            className="btn px-2 py-1 text-xs text-accent"
            onClick={() => rt.onNavigate(value)}
          >
            →
          </button>
        )}
      </span>
      {chrome.help}
    </label>
  );
}
