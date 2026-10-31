import { useState } from "react";
import { CollapsibleSidePanel, usePersistedCollapse } from "@/components/collapsible-side-panel";
import type { GameSystemOption } from "@/features/game-systems/systems";
import type { BuilderState } from "./builder-state";
import type { TemplateActions } from "./builder-actions";
import type { TemplateIO } from "./builder-io";
import { SavePresetModal } from "./builder-preset-modal";

interface Props {
  st: BuilderState;
  actions: TemplateActions;
  io: TemplateIO;
  systems: GameSystemOption[];
}

/** Panneau gauche : liste des modèles, création, export/import, preset système. */
export function TemplateSidebar({ st, actions, io, systems }: Props) {
  const [presetOpen, setPresetOpen] = useState(false);
  const {
    campaignId,
    items,
    grouped,
    selected,
    categories,
    newOpen,
    newName,
    newCategory,
    setNewOpen,
    setNewName,
    setNewCategory,
    fileRef,
    setSelectedId,
    setStatus,
    setError,
    setNotice,
  } = st;
  const { handleCreate } = actions;
  const { handleExport, handleImportFile } = io;
  const [collapsed, toggleCollapsed] = usePersistedCollapse("aetheris:builder:models-collapsed");

  return (
    <CollapsibleSidePanel
      id="panel-modeles"
      label={`Modèles (${items.length})`}
      side="left"
      collapsed={collapsed}
      onToggle={toggleCollapsed}
      width="w-64"
    >
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="btn px-2 py-0.5 text-xs text-accent"
            onClick={() => setNewOpen((o) => !o)}
          >
            + Nouveau
          </button>
        </div>
        {newOpen && (
          <form onSubmit={handleCreate} className="flex flex-col gap-2">
            <input
              className="input py-1 text-sm"
              name="modele-nouveau-nom"
              placeholder="Nom (ex. PNJ D&D5e)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              required
            />
            <input
              className="input py-1 text-sm"
              name="modele-nouvelle-categorie"
              placeholder="Catégorie (ex. Encyclopédie)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              list={`${campaignId}-tcat`}
            />
            <datalist id={`${campaignId}-tcat`}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <button type="submit" className="btn btn-primary py-1 text-xs">
              Créer
            </button>
          </form>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn flex-1 px-2 py-1 text-xs"
            onClick={handleExport}
            disabled={items.length === 0}
          >
            Exporter
          </button>
          <button
            type="button"
            className="btn flex-1 px-2 py-1 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            Importer
          </button>
          <input
            ref={fileRef}
            type="file"
            name="importation-modeles"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void handleImportFile(e)}
          />
        </div>
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          disabled={!selected}
          onClick={() => setPresetOpen(true)}
          title="Ranger ce modèle dans un système de jeu pour le réutiliser"
        >
          Enregistrer comme preset…
        </button>
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto p-2">
        {grouped.size === 0 && <p className="p-3 text-xs text-muted">Aucun modèle.</p>}
        {[...grouped.entries()].map(([cat, list]) => (
          <div key={cat || "__root"} className="mb-3">
            <p className="px-2 py-1 text-[0.6rem] tracking-widest text-muted uppercase">
              {cat || "Sans catégorie"}
            </p>
            <ul>
              {list.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(t.id);
                      setStatus("idle");
                      setError(null);
                    }}
                    className={`block w-full truncate border-l-2 px-2 py-1.5 text-left text-sm ${
                      selected?.id === t.id
                        ? "border-accent bg-card-hover text-foreground"
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {presetOpen && selected && (
        <SavePresetModal
          campaignId={campaignId}
          template={selected}
          systems={systems}
          onClose={() => setPresetOpen(false)}
          onSaved={setNotice}
        />
      )}
    </CollapsibleSidePanel>
  );
}
