import { ImageUploadField } from "@/components/image-upload";

interface CreateNovelDialogFieldsProps {
  genres: string[];
  cover: string | null;
  onCoverChange: (url: string) => void;
}

/**
 * Champs du formulaire « Nouveau roman » : titre, synopsis et couverture
 * (aperçu, envoi Blob ou URL distante).
 */
export function CreateNovelDialogFields({
  genres,
  cover,
  onCoverChange,
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

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Genre</span>
          <select name="genre" defaultValue="" className="input">
            <option value="">— Aucun —</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Tags</span>
          <input name="tags" maxLength={440} placeholder="tag, tag, …" className="input" />
        </label>
      </div>

      <ImageUploadField
        label="Image de couverture"
        value={cover ?? ""}
        onChange={onCoverChange}
        purpose="cover"
        hint="PNG, JPEG, WebP ou GIF · 8 Mo max, ou collez une URL http(s)."
      />
    </div>
  );
}
