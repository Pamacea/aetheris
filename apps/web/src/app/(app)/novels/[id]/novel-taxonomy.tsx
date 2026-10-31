"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateNovel } from "@/features/novels/actions";
import { parseTags } from "@/features/novels/logic";

/** Genre et tags du roman, édités sans modale sous les métadonnées. */
export function NovelTaxonomy({
  novelId,
  genre,
  tags,
  genres,
}: {
  novelId: string;
  genre: string | null;
  tags: string[];
  genres: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function save(patch: { genre?: string | null; tags?: string[] }) {
    setError(null);
    startTransition(async () => {
      const res = await updateNovel(novelId, patch);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="text-muted">Genre</span>
          <select
            name="roman-genre"
            defaultValue={genre ?? ""}
            aria-label="Genre du roman"
            className="input input-sm w-40"
            onChange={(e) => save({ genre: e.target.value || null })}
          >
            <option value="">— Aucun —</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-muted">Tags</span>
          <input
            name="roman-tags"
            defaultValue={tags.join(", ")}
            placeholder="tag, tag, …"
            maxLength={440}
            aria-label="Tags du roman, séparés par des virgules"
            className="input input-sm min-w-0 flex-1"
            onBlur={(e) => {
              const next = parseTags(e.target.value);
              if (next.join(",") !== tags.join(",")) save({ tags: next });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
