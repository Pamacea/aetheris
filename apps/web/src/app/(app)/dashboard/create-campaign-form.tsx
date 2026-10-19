import type { GameSystemRecord } from "@aetheris/shared";
import type { FileKind } from "./create-campaign-files";
import { ImagePicker } from "./create-campaign-image-picker";
import { CreateCampaignSystemField } from "./create-campaign-system-field";
import { CreateCampaignThemeField } from "./create-campaign-theme-field";

type CreateCampaignFormProps = {
  customSystems: GameSystemRecord[];
  pending: boolean;
  error: string | null;
  theme: string;
  themeScript: string | null;
  themeScriptName: string | null;
  gameSystem: string;
  cover: string | null;
  logo: string | null;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  themeInputRef: React.RefObject<HTMLInputElement | null>;
  onPickTheme: (id: string) => void;
  onPickSystem: (id: string) => void;
  onFile: (kind: FileKind, file: File | undefined) => void;
  onRemoveThemeScript: () => void;
  onClearCover: () => void;
  onClearLogo: () => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function CreateCampaignForm({
  customSystems,
  pending,
  error,
  theme,
  themeScript,
  themeScriptName,
  gameSystem,
  cover,
  logo,
  coverInputRef,
  logoInputRef,
  themeInputRef,
  onPickTheme,
  onPickSystem,
  onFile,
  onRemoveThemeScript,
  onClearCover,
  onClearLogo,
  onClose,
  onSubmit,
}: CreateCampaignFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="panel relative flex max-h-[90vh] w-[min(92vw,540px)] flex-col overflow-y-auto p-6"
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <h2 className="text-xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Créer une campagne
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="btn px-2 py-0.5 text-sm"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-col gap-5">
        {/* Nom */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
            Nom de la campagne
          </span>
          <input
            name="title"
            required
            maxLength={120}
            autoFocus
            placeholder="La Chute d'Aetheris"
            className="input"
          />
        </label>

        <CreateCampaignThemeField
          theme={theme}
          themeScript={themeScript}
          themeScriptName={themeScriptName}
          themeInputRef={themeInputRef}
          onPick={onPickTheme}
          onPickScript={(f) => onFile("theme", f)}
          onRemoveScript={onRemoveThemeScript}
        />

        <CreateCampaignSystemField
          gameSystem={gameSystem}
          customSystems={customSystems}
          onPick={onPickSystem}
        />

        {/* Couverture + logo */}
        <div className="grid grid-cols-2 gap-3">
          <ImagePicker
            label="Couverture"
            preview={cover}
            inputRef={coverInputRef}
            onPick={(f) => onFile("cover", f)}
            onClear={onClearCover}
          />
          <ImagePicker
            label="Logo"
            preview={logo}
            inputRef={logoInputRef}
            onPick={(f) => onFile("logo", f)}
            onClear={onClearLogo}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 border border-destructive/60 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <footer className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={pending} className="btn">
          Annuler
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary btn-broken">
          {pending ? "Création…" : "Valider"}
        </button>
      </footer>
    </form>
  );
}
