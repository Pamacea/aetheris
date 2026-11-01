import { useState } from "react";
import { GameModal } from "@/components/game-modal";
import { ImageUploadField } from "@/components/image-upload";

/**
 * Image du jeton : un bouton compact dans la barre (miniature si définie) et
 * une modale d'import — fichier local ou URL. Rien n'est appliqué avant
 * « Valider » ; le serveur ne retient que les URL http(s) (`tokenImageUrlSchema`).
 */
export function TokenImageButton({
  imageUrl,
  onSave,
}: {
  imageUrl: string | null;
  onSave: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const value = draft.trim();
  const invalid = value !== "" && !/^https?:\/\//i.test(value);

  return (
    <>
      <button
        type="button"
        title="Image du jeton"
        aria-label="Image du jeton"
        onClick={() => {
          setDraft(imageUrl ?? "");
          setOpen(true);
        }}
        className="flex h-6 shrink-0 items-center gap-1.5 border border-border px-1.5 text-[0.6rem] tracking-wider text-muted uppercase transition hover:text-foreground"
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-4 w-4 shrink-0 object-cover" />
        )}
        Image
      </button>

      <GameModal open={open} onClose={() => setOpen(false)} label="Image du jeton">
        <div className="flex flex-col gap-4">
          <ImageUploadField
            label="Image"
            value={draft}
            onChange={setDraft}
            purpose="token"
            hint="PNG, JPEG, WebP ou GIF · 8 Mo max, ou collez une URL http(s)."
          />
          {invalid && (
            <p role="alert" className="text-xs text-destructive">
              URL http(s) attendue.
            </p>
          )}
          <footer className="flex justify-end gap-2">
            <button
              type="button"
              className="btn px-3 py-1.5 text-xs"
              onClick={() => setOpen(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-primary px-3 py-1.5 text-xs"
              disabled={invalid}
              onClick={() => {
                onSave(value);
                setOpen(false);
              }}
            >
              Valider
            </button>
          </footer>
        </div>
      </GameModal>
    </>
  );
}
