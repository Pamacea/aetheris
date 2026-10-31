"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GameModal } from "@/components/game-modal";
import { createNovel, updateNovel } from "@/features/novels/actions";
import { parseTags } from "@/features/novels/logic";
import { readCoverFile } from "@/features/novels/cover-image";
import { CreateNovelDialogFields } from "./create-novel-dialog-fields";
import { IconCross } from "./icons";

export function CreateNovelButton({ genres }: { genres: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setCover(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function handleCover(file: File | undefined) {
    if (!file) return;
    setError(null);
    readCoverFile(file).then(setCover, (e: Error) => setError(e.message));
  }

  function clearCover() {
    setCover(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const synopsis = String(data.get("synopsis") ?? "").trim();
    const genre = String(data.get("genre") ?? "").trim();
    const tags = parseTags(String(data.get("tags") ?? ""));

    setError(null);
    startTransition(async () => {
      const created = await createNovel({
        title,
        synopsis: synopsis || undefined,
        genre: genre || null,
        tags,
      });
      if (!created.ok) {
        setError(created.error);
        return;
      }
      if (cover) await updateNovel(created.id, { coverImage: cover });
      setOpen(false);
      router.push(`/novels/${created.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary btn-broken" onClick={() => setOpen(true)}>
        + Nouveau roman
      </button>

      {/* Monté conditionnellement : le formulaire doit être démonté à la
          fermeture pour repartir d'inputs vides. frame={false} : il porte
          déjà son panneau et son entête. Échap/clic → close() (bloqué
          pendant `pending`). */}
      {open && (
        <GameModal open={open} onClose={close} label="Créer un roman" frame={false}>
          <form
            onSubmit={handleSubmit}
            className="panel relative flex max-h-[90vh] w-[min(92vw,540px)] flex-col overflow-y-auto p-6"
          >
            <header className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-xl tracking-wide">
                <span className="mark-tri" aria-hidden />
                Nouveau roman
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

            <CreateNovelDialogFields
              genres={genres}
              cover={cover}
              coverInputRef={coverInputRef}
              onCoverPick={handleCover}
              onCoverClear={clearCover}
            />

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <footer className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={close} disabled={pending} className="btn">
                Annuler
              </button>
              <button type="submit" disabled={pending} className="btn btn-primary btn-broken">
                {pending ? "Création…" : "Créer"}
              </button>
            </footer>
          </form>
        </GameModal>
      )}
    </>
  );
}
