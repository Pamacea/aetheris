"use client";

/** Formulaire de création / édition d'un handout (champs pilotés par l'app). */
export function JournalForm({
  editingId,
  title,
  setTitle,
  imageUrl,
  setImageUrl,
  content,
  setContent,
  error,
  pending,
  onSubmit,
  onCancel,
}: {
  editingId?: string;
  title: string;
  setTitle: (v: string) => void;
  imageUrl: string;
  setImageUrl: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  error: string | null;
  pending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <form onSubmit={onSubmit} className="mx-auto flex flex-col gap-4">
        <h1 className="font-display text-xl">
          {editingId ? "Modifier le handout" : "Nouveau handout"}
        </h1>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Titre
          <input
            className="input"
            name="handout-titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={160}
            placeholder="La créature des marais…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Image (URL ou data-URI)
          <input
            className="input"
            name="handout-image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            maxLength={2048}
            placeholder="https://…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Contenu
          <textarea
            className="input min-h-48 resize-y"
            name="handout-contenu"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={10000}
            placeholder="Description, notes de MJ, récit…"
          />
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn" disabled={pending || title.trim() === ""}>
            {editingId ? "Enregistrer" : "Créer"}
          </button>
          <button type="button" className="btn" disabled={pending} onClick={onCancel}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
