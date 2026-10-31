import { useState } from "react";
import type { BuilderState } from "./builder-state";
import type { TemplateActions } from "./builder-actions";
import type { TemplateIO } from "./builder-io";

interface Props {
  st: BuilderState;
  actions: TemplateActions;
  io: TemplateIO;
}

/** Panneau gauche : liste des modèles, création, export/import. */
export function TemplateSidebar({ st, actions, io }: Props) {
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
  } = st;
  const { handleCreate } = actions;
  const { handleExport, handleImportFile } = io;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label="Panneau des modèles"
      className={`flex shrink-0 flex-col overflow-hidden border-r border-border bg-card ${
        collapsed ? "w-9" : "w-64"
      }`}
    >
      {collapsed && (
        <button
          type="button"
          className="flex w-full justify-center py-2 text-muted hover:text-foreground"
          aria-expanded={false}
          aria-controls="panel-modeles"
          aria-label="Déplier le panneau des modèles"
          title="Déplier les modèles"
          onClick={() => setCollapsed(false)}
        >
          ›
        </button>
      )}
      <div id="panel-modeles" className={collapsed ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.65rem] tracking-[0.2em] text-muted uppercase">
              Modèles ({items.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="btn px-2 py-0.5 text-xs text-accent"
                onClick={() => setNewOpen((o) => !o)}
              >
                + Nouveau
              </button>
              <button
                type="button"
                className="btn px-1.5 py-0.5 text-xs"
                aria-expanded={true}
                aria-controls="panel-modeles"
                aria-label="Replier le panneau des modèles"
                title="Replier les modèles"
                onClick={() => setCollapsed(true)}
              >
                ‹
              </button>
            </div>
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
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
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
      </div>
    </aside>
  );
}
