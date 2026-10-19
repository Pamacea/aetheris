import { GAME_SYSTEMS, type GameSystemRecord } from "@aetheris/shared";

type CreateCampaignSystemFieldProps = {
  gameSystem: string;
  customSystems: GameSystemRecord[];
  onPick: (id: string) => void;
};

export function CreateCampaignSystemField({
  gameSystem,
  customSystems,
  onPick,
}: CreateCampaignSystemFieldProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
        Système de jeu
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {GAME_SYSTEMS.map((s) => (
          <label
            key={s.id}
            className={`cursor-pointer border px-3 py-2 text-sm transition ${
              gameSystem === s.id
                ? "border-accent bg-card-hover text-foreground"
                : "border-border text-muted hover:bg-card-hover"
            }`}
          >
            <input
              type="radio"
              name="gameSystem"
              value={s.id}
              checked={gameSystem === s.id}
              onChange={() => onPick(s.id)}
              className="sr-only"
            />
            <span className="block font-medium">{s.name}</span>
            <span className="block text-xs opacity-70">{s.description}</span>
          </label>
        ))}
        {customSystems.map((s) => (
          <label
            key={s.id}
            className={`cursor-pointer border px-3 py-2 text-sm transition ${
              gameSystem === s.id
                ? "border-accent bg-card-hover text-foreground"
                : "border-border text-muted hover:bg-card-hover"
            }`}
          >
            <input
              type="radio"
              name="gameSystem"
              value={s.id}
              checked={gameSystem === s.id}
              onChange={() => onPick(s.id)}
              className="sr-only"
            />
            <span className="block font-medium">{s.name}</span>
            <span className="block truncate text-xs opacity-70">
              {s.description ?? "Système personnalisé"}
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">
        Un système custom pourra être importé ou modifié plus tard depuis l&apos;éditeur de
        campagne.
      </p>
    </fieldset>
  );
}
