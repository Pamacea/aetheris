import type { Editor } from "@tiptap/core";
import { isBlockInGmSecret, setBlockGmScope } from "./blocks-scope";

/**
 * Case « MJ » d'un bloc : bascule la portée en enveloppant le bloc dans un
 * `<gm-secret>` (retiré par stripGmSecrets côté joueurs et page publique).
 * Rendue uniquement en édition MJ (`editor.isEditable`).
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
    <label
      className={`flex shrink-0 cursor-pointer items-center gap-1.5 text-xs whitespace-nowrap text-muted ${className ?? ""}`}
      title="Portée MJ : masqué aux joueurs et sur le lien public"
    >
      <input
        type="checkbox"
        checked={gm}
        disabled={pos === undefined}
        onChange={(e) => {
          if (pos !== undefined) setBlockGmScope(editor, pos, e.target.checked);
        }}
      />
      MJ
    </label>
  );
}
