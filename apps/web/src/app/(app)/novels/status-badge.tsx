const NOVEL_LABELS: Record<string, string> = {
  draft: "Brouillon",
  writing: "En écriture",
  published: "Publié",
};

const CHAPTER_LABELS: Record<string, string> = {
  draft: "Brouillon",
  review: "Relecture",
  published: "Publié",
};

const STYLES: Record<string, string> = {
  draft: "border-border text-muted",
  writing: "border-accent/60 text-accent",
  review: "border-accent/40 text-accent/70",
  published: "border-accent bg-accent/10 text-accent",
};

/** Badge de statut (roman : draft/writing/published, chapitre : draft/review/published). */
export function StatusBadge({
  status,
  kind = "novel",
}: {
  status: string;
  kind?: "novel" | "chapter";
}) {
  const labels = kind === "novel" ? NOVEL_LABELS : CHAPTER_LABELS;
  return (
    <span
      className={`border px-1.5 py-0.5 text-[0.6rem] tracking-widest uppercase ${
        STYLES[status] ?? STYLES.draft
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}
