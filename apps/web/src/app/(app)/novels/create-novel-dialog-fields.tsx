import { IconCross } from "./icons";

interface CreateNovelDialogFieldsProps {
  cover: string | null;
  coverInputRef: { current: HTMLInputElement | null };
  onCoverPick: (file: File | undefined) => void;
  onCoverClear: () => void;
}

/**
 * Champs du formulaire « Nouveau roman » : titre, synopsis et couverture
 * (aperçu + fichier caché).
 */
export function CreateNovelDialogFields({
  cover,
  coverInputRef,
  onCoverPick,
  onCoverClear,
}: CreateNovelDialogFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Titre</span>
        <input
          name="title"
          required
          maxLength={200}
          autoFocus
          placeholder="Les Cendres d'Aetheris"
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Synopsis</span>
        <textarea
          name="synopsis"
          rows={2}
          maxLength={5000}
          placeholder="Un résumé de l'intrigue…"
          className="input resize-y"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Couverture</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn flex-1 px-3 py-1.5 text-xs"
            onClick={() => coverInputRef.current?.click()}
          >
            {cover ? "Changer" : "Parcourir…"}
          </button>
          {cover && (
            <button
              type="button"
              className="btn px-2 py-1.5 text-xs"
              onClick={onCoverClear}
              aria-label="Retirer la couverture"
            >
              <IconCross className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="panel flex h-24 items-center justify-center overflow-hidden">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="Aperçu de la couverture" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted">Aperçu</span>
          )}
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => onCoverPick(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
