export function ImagePicker({
  label,
  preview,
  inputRef,
  onPick,
  onClear,
}: {
  label: string;
  preview: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn flex-1 px-3 py-1.5 text-xs"
          onClick={() => inputRef.current?.click()}
        >
          {preview ? "Changer" : "Parcourir…"}
        </button>
        {preview && (
          <button
            type="button"
            className="btn px-2 py-1.5 text-xs"
            onClick={onClear}
            aria-label={`Retirer ${label}`}
          >
            ✕
          </button>
        )}
      </div>
      <div className="panel flex h-16 items-center justify-center overflow-hidden">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`Aperçu ${label}`} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-muted">Aperçu</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={label}
        accept="image/*"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </div>
  );
}
