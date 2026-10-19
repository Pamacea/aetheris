import { TEMPLATE_PRESETS } from "@aetheris/shared";
import type { WikiTemplateMeta } from "../wiki-app";
import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import type { TemplateActions } from "./builder-actions";

interface Props {
  st: BuilderState;
  selected: WikiTemplateMeta;
  ops: FieldOps;
  actions: TemplateActions;
}

/** En-tête de l'éditeur : nom, catégorie, presets, statut, enregistrer/supprimer. */
export function BuilderHeader({ st, selected, ops, actions }: Props) {
  const { campaignId, categories, status } = st;
  const { patchSelected } = ops;
  const { handleSave, handleDelete, handlePresetCreate, handlePresetReplace } = actions;

  const statusLabel =
    status === "saving"
      ? "Enregistrement…"
      : status === "dirty"
        ? "Modifications non enregistrées"
        : status === "error"
          ? "Erreur"
          : status === "saved"
            ? "Enregistré ✓"
            : "À jour";

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">Nom</span>
          <input
            className="input w-56 py-1 text-sm"
            name="modele-nom"
            value={selected.name}
            onChange={(e) => patchSelected((t) => ({ ...t, name: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">Catégorie</span>
          <input
            className="input w-44 py-1 text-sm"
            name="modele-categorie"
            value={selected.category ?? ""}
            placeholder="Sans catégorie"
            onChange={(e) =>
              patchSelected((t) => ({
                ...t,
                category: e.target.value || null,
              }))
            }
            list={`${campaignId}-tcat-edit`}
          />
          <datalist id={`${campaignId}-tcat-edit`}>
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <select
          className="input w-48 py-1 text-xs"
          name="preset-ajout"
          value=""
          aria-label="Ajouter depuis un preset"
          onChange={(e) => {
            const raw = e.target.value;
            e.target.value = ""; // repasse le placeholder après le choix
            const sep = raw.indexOf(":");
            const preset = TEMPLATE_PRESETS.find((p) => p.id === raw.slice(sep + 1));
            if (!preset || sep < 0) return;
            if (raw.startsWith("new:")) void handlePresetCreate(preset);
            else void handlePresetReplace(preset);
          }}
        >
          <option value="">Ajouter depuis un preset…</option>
          <optgroup label="Créer un modèle">
            {TEMPLATE_PRESETS.map((p) => (
              <option key={`new:${p.id}`} value={`new:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Remplacer les champs">
            {TEMPLATE_PRESETS.map((p) => (
              <option key={`replace:${p.id}`} value={`replace:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </select>
        <span
          className={`text-[0.65rem] tracking-widest uppercase ${
            status === "error" ? "text-destructive" : "text-muted"
          }`}
        >
          {statusLabel}
        </span>
        <button
          type="button"
          className="btn btn-primary px-3 py-1 text-xs"
          onClick={() => void handleSave()}
          disabled={status === "saving"}
        >
          Enregistrer
        </button>
        <button
          type="button"
          className="btn px-2 py-1 text-xs text-destructive"
          onClick={() => void handleDelete()}
        >
          Supprimer
        </button>
      </div>
    </header>
  );
}
