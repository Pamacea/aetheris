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
    <label className="flex flex-col gap-0.5">
      <span className="text-[0.6rem] tracking-widest text-muted uppercase">{label}</span>
      <input
        className={`input w-32 py-1 text-xs ${mono ? "font-mono" : ""}`}
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
