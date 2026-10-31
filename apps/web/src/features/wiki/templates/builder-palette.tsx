import { useState } from "react";
import { CollapsibleSidePanel, usePersistedCollapse } from "@/components/collapsible-side-panel";
import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import { KIND_GLYPHS } from "./builder-field-factory";
import { PALETTE_GROUPS, filterPaletteGroups } from "./builder-palette-data";

interface Props {
  st: BuilderState;
  ops: FieldOps;
}

/** Panneau latéral droit : palette de champs filtrable, à glisser ou cliquer. */
export function FieldPalette({ st, ops }: Props) {
  const { setDrag } = st;
  const { insertField, handleDragEnd } = ops;
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = usePersistedCollapse("aetheris:builder:palette-collapsed");
  const groups = filterPaletteGroups(PALETTE_GROUPS, query);

  return (
    <CollapsibleSidePanel
      id="panel-palette"
      label="Palette"
      side="right"
      collapsed={collapsed}
      onToggle={toggleCollapsed}
      width="w-56"
    >
      <div className="flex flex-col gap-2 border-b border-border px-3 py-3">
        <input
          type="search"
          className="input h-8 w-full text-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un champ…"
          aria-label="Rechercher un champ"
        />
      </div>
      <div className="no-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto p-2">
        {groups.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted">
            Aucun champ pour « {query.trim()} ».
          </p>
        )}
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <p className="px-1 text-[0.6rem] tracking-widest text-muted uppercase">{group.title}</p>
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", item.key);
                  setDrag({ key: item.key });
                }}
                onDragEnd={handleDragEnd}
                onClick={() => insertField(item.make)}
                title="Glisser dans la liste des champs, ou cliquer pour ajouter"
                className="flex cursor-grab items-start gap-2 border border-border bg-background px-2 py-1.5 text-left transition hover:border-accent hover:bg-card-hover active:cursor-grabbing"
              >
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center border border-border bg-card font-mono text-[0.6rem] text-accent"
                >
                  {KIND_GLYPHS[item.make("_").kind]}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-foreground">{item.label}</span>
                  <span className="block text-[0.6rem] leading-tight text-muted">{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </CollapsibleSidePanel>
  );
}
