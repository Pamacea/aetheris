import { BLOCK_MIME } from "./blocks-dnd";

export type SubTab = "blocs" | "biblio";

/** Sous-onglets « Blocs » / « Bibliothèque » (ARIA tablist — motif du
 *  tablist latéral), avec bascule au survol d'un drag. */
export function BlocksSubTabs({
  sub,
  setSub,
  isGM,
  onDrop,
}: {
  sub: SubTab;
  setSub: (s: SubTab) => void;
  isGM: boolean;
  /** Drop finalisé sur l'onglet lui-même (la panneau cible se révèle au survol). */
  onDrop: (e: React.DragEvent, target: SubTab) => void;
}) {
  const subTabCls = (active: boolean) =>
    `flex-1 px-3 py-2 text-[0.65rem] tracking-widest uppercase ${
      active ? "border-b-2 border-accent text-foreground" : "text-muted hover:text-foreground"
    }`;

  /** Bascule d'onglet au survol d'un drag : les deux panneaux ne sont jamais
   *  visibles en même temps, sans quoi Blocs ⇄ Bibliothèque serait impossible. */
  const tabDragOver = (target: SubTab) => (e: React.DragEvent) => {
    if (!isGM || !e.dataTransfer.types.includes(BLOCK_MIME)) return;
    e.preventDefault(); // autorise le drop sur le bouton
    if (sub !== target) setSub(target);
  };

  return (
    <div role="tablist" aria-label="Blocs et bibliothèque" className="flex border-b border-border">
      <button
        type="button"
        role="tab"
        id="stab-blocs"
        aria-selected={sub === "blocs"}
        aria-controls="spanel-blocs"
        onDragOver={tabDragOver("blocs")}
        onDrop={(e) => onDrop(e, "blocs")}
        onClick={() => setSub("blocs")}
        className={subTabCls(sub === "blocs")}
      >
        Blocs
      </button>
      <button
        type="button"
        role="tab"
        id="stab-biblio"
        aria-selected={sub === "biblio"}
        aria-controls="spanel-biblio"
        onDragOver={tabDragOver("biblio")}
        onDrop={(e) => onDrop(e, "biblio")}
        onClick={() => setSub("biblio")}
        className={subTabCls(sub === "biblio")}
      >
        Bibliothèque
      </button>
    </div>
  );
}
