/** Champ d'entrée compact libellé pour la configuration des champs. */
export function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  mono,
  list,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  mono?: boolean;
  list?: string;
}) {
  return (
    <label className="flex min-h-7 items-center justify-between gap-2">
      <span className="shrink-0 text-[0.6rem] tracking-widest text-muted uppercase">{label}</span>
      <input
        className={`input h-7 w-36 min-w-0 px-2 py-0 text-xs ${mono ? "font-mono" : ""}`}
        name={label}
        type={type}
        value={value}
        placeholder={placeholder}
        list={list}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
