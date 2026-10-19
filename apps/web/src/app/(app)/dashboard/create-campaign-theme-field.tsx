import { NATIVE_THEMES } from "@aetheris/shared";

type CreateCampaignThemeFieldProps = {
  theme: string;
  themeScript: string | null;
  themeScriptName: string | null;
  themeInputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (id: string) => void;
  onPickScript: (file: File | undefined) => void;
  onRemoveScript: () => void;
};

export function CreateCampaignThemeField({
  theme,
  themeScript,
  themeScriptName,
  themeInputRef,
  onPick,
  onPickScript,
  onRemoveScript,
}: CreateCampaignThemeFieldProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Thème</legend>
      <div className="grid grid-cols-2 gap-2">
        {NATIVE_THEMES.map((t) => (
          <label
            key={t.id}
            className={`cursor-pointer border px-3 py-2 text-sm transition ${
              theme === t.id && !themeScript
                ? "border-accent bg-card-hover text-foreground"
                : "border-border text-muted hover:bg-card-hover"
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={t.id}
              checked={theme === t.id && !themeScript}
              onChange={() => onPick(t.id)}
              className="sr-only"
            />
            <span className="block font-medium">{t.name}</span>
            <span className="block text-xs opacity-70">{t.description}</span>
          </label>
        ))}
        <button
          type="button"
          onClick={() => themeInputRef.current?.click()}
          className={`cursor-pointer border px-3 py-2 text-left text-sm transition ${
            themeScript
              ? "border-accent bg-card-hover text-foreground"
              : "border-border text-muted hover:bg-card-hover"
          }`}
        >
          <span className="block font-medium">Thème custom</span>
          <span className="block truncate text-xs opacity-70">
            {themeScriptName ?? "Importer un script .js"}
          </span>
        </button>
      </div>
      <input
        ref={themeInputRef}
        type="file"
        name="script-theme-personnalise"
        accept=".js,.mjs,text/javascript"
        className="sr-only"
        onChange={(e) => onPickScript(e.target.files?.[0])}
      />
      {themeScript && (
        <p className="text-xs text-muted">
          Script chargé ({themeScriptName}) —{" "}
          <button type="button" className="underline hover:text-accent" onClick={onRemoveScript}>
            retirer
          </button>
        </p>
      )}
    </fieldset>
  );
}
