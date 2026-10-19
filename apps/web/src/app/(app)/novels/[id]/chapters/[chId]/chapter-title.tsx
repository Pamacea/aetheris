"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateChapter } from "@/features/novels/actions";

/**
 * Titre du chapitre éditable (blur ou Enter = sauvegarde via `updateChapter`),
 * même UX que le titre du roman dans novel-meta.
 */
export function ChapterTitleInput({
  novelId,
  chapterId,
  title,
  className = "",
}: {
  novelId: string;
  chapterId: string;
  title: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Resynchronisation quand le serveur confirme (router.refresh()).
  const [prevTitle, setPrevTitle] = useState(title);
  if (prevTitle !== title) {
    setPrevTitle(title);
    setValue(title);
  }

  function save() {
    const t = value.trim();
    if (!t || t === title) {
      setValue(title);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateChapter(novelId, chapterId, { title: t });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        aria-label="Titre du chapitre"
        maxLength={200}
        className={`input min-w-0 ${className}`}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
