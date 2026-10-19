import type { Editor } from "@tiptap/core";
import { isBlockInGmSecret, setBlockGmScope } from "./blocks-scope";

/**
 * Portée du bloc : petit bouton d'état MJ / ALL (DA, `aria-pressed`, état
 * actif accent — jamais de checkbox native). Clic → le bloc devient MJ
 * (secret), re-clic → ALL (global). La bascule enveloppe/sort le bloc d'un
 * `<gm-secret>` (strippé côté joueurs et page publique) — le toggle ne
 * masque ni ne supprime rien. Rendu seulement en édition MJ
 * (`editor.isEditable`) : les joueurs ne voient jamais ce bouton.
 */
export function BlockScopeToggle({
  editor,
  getPos,
  className,
}: {
  editor: Editor;
  getPos: () => number | undefined;
  className?: string;
}) {
  const pos = getPos();
  const gm = pos !== undefined && isBlockInGmSecret(editor.state, pos);
  return (
    <button
      type="button"
      className={`btn px-1.5 py-0.5 text-xs whitespace-nowrap ${gm ? "border-accent text-accent" : ""} ${className ?? ""}`}
      aria-pressed={gm}
      disabled={pos === undefined}
      title={
        gm
          ? "Bloc MJ (secret) — cliquer pour le rendre global (ALL)"
          : "Bloc global — cliquer pour le passer en MJ"
      }
      onClick={() => {
        if (pos !== undefined) setBlockGmScope(editor, pos, !gm);
      }}
    >
      {gm ? "MJ" : "ALL"}
    </button>
  );
}
