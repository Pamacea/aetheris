"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GameModal } from "@/components/game-modal";
import { updateNovel } from "@/features/novels/actions";
import { readCoverFile } from "@/features/novels/cover-image";
import { IconCross } from "../icons";

/**
 * Couverture du roman : clic (auteur) → modale d'import façon galerie
 * (glisser-déposer ou parcourir), aperçu, retrait et enregistrement.
 */
export function NovelCover({
  novelId,
  coverImage,
  title,
  editable,
}: {
  novelId: string;
  coverImage: string | null;
  title: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(coverImage);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openPicker() {
    setDraft(coverImage);
    setError(null);
    setOpen(true);
  }

  function close() {
    if (pending) return;
    setOpen(false);
  }

  function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    readCoverFile(file).then(setDraft, (e: Error) => setError(e.message));
  }

  function save() {
    startTransition(async () => {
      const res = await updateNovel(novelId, { coverImage: draft });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="panel relative h-40 w-28 shrink-0 overflow-hidden">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt={`Couverture de ${title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-muted">
            <span className="mark-tri" style={{ marginRight: 0 }} aria-hidden />
          </div>
        )}

        {editable && (
          <button
            type="button"
            onClick={openPicker}
            aria-label={coverImage ? "Changer la couverture" : "Ajouter une couverture"}
            className="absolute inset-0 flex cursor-pointer items-end justify-center bg-black/0 pb-1 text-[0.6rem] tracking-widest text-white uppercase transition hover:bg-black/45 focus-visible:bg-black/45"
          >
            <span className="bg-black/70 px-1.5 py-0.5">{coverImage ? "Changer" : "Ajouter"}</span>
          </button>
        )}
      </div>

      {open && (
        <GameModal open={open} onClose={close} label="Couverture du roman" frame={false}>
          <div className="panel relative flex max-h-[90vh] w-[min(92vw,560px)] flex-col overflow-y-auto p-6">
            <header className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-xl tracking-wide">
                <span className="mark-tri" aria-hidden />
                Couverture
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="btn px-2 py-0.5 text-sm"
              >
                <IconCross className="h-3 w-3" />
              </button>
            </header>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="panel h-40 w-28 shrink-0 overflow-hidden">
                {draft ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl text-muted">
                    <span className="mark-tri" style={{ marginRight: 0 }} aria-hidden />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pick(e.dataTransfer.files[0]);
                  }}
                  className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-border px-4 py-6 text-center text-sm transition hover:bg-card-hover"
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => pick(e.target.files?.[0])}
                  />
                  <span>Glissez une image ici</span>
                  <span className="text-xs text-muted">
                    ou cliquez pour parcourir · max ~1,2 Mo
                  </span>
                </label>
                {draft && (
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="self-start text-xs text-muted underline-offset-2 hover:text-destructive hover:underline"
                  >
                    Retirer l&apos;image
                  </button>
                )}
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <footer className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={close} disabled={pending} className="btn">
                Annuler
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending || draft === coverImage}
                className="btn btn-primary"
              >
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </footer>
          </div>
        </GameModal>
      )}
    </>
  );
}
