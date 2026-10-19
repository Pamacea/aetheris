import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import { PALETTE_GROUPS } from "./builder-palette-data";

interface Props {
  st: BuilderState;
  ops: FieldOps;
}

/** Panneau latéral droit : palette de champs à glisser ou cliquer. */
export function FieldPalette({ st, ops }: Props) {
  const { fields, setDrag } = st;
  const { insertField, handleDragEnd } = ops;

  return (
    <aside className="flex w-52 shrink-0 flex-col overflow-hidden border-l border-border bg-card">
      <div className="border-b border-border px-3 py-3">
        <p className="text-[0.65rem] tracking-[0.2em] text-muted uppercase">Palette</p>
        <p className="mt-1 text-[0.65rem] leading-snug text-muted">
          Glissez un champ dans la liste — ou cliquez pour l’ajouter à la fin.
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-2">
        {PALETTE_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-1.5">
            <p className="px-1 text-[0.6rem] tracking-widest text-muted uppercase">{group.title}</p>
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", item.key);
                  setDrag({ source: "palette", key: item.key });
                }}
                onDragEnd={handleDragEnd}
                onClick={() => insertField(item.make, fields.length)}
                title="Glisser dans la liste des champs, ou cliquer pour ajouter"
                className="flex cursor-grab flex-col gap-0.5 border border-border bg-background px-2 py-1.5 text-left hover:border-accent hover:bg-card-hover active:cursor-grabbing"
              >
                <span className="text-xs text-foreground">{item.label}</span>
                <span className="text-[0.6rem] leading-tight text-muted">{item.hint}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
