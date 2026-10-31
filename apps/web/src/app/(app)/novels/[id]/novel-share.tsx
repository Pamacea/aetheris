"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GameModal } from "@/components/game-modal";
import { CopyIcon, ShareIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { setNovelShare } from "@/features/novels/actions";

const MODES = [
  { value: "read", label: "Lecture", hint: "Chapitres publiés uniquement." },
  {
    value: "review",
    label: "Relecture",
    hint: "Tous les chapitres, brouillons inclus, en lecture seule.",
  },
  {
    value: "edit",
    label: "Éditeur",
    hint: "Un utilisateur connecté peut modifier le roman après avoir accepté le lien.",
  },
] as const;

type ShareMode = (typeof MODES)[number]["value"];

/** Gestion du lien de partage d'un roman (auteur uniquement). */
export function NovelShare({
  novelId,
  token,
  mode,
  baseUrl,
}: {
  novelId: string;
  token: string | null;
  mode: string | null;
  baseUrl: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [currentToken, setCurrentToken] = useState(token);
  const [currentMode, setCurrentMode] = useState<ShareMode | null>(mode as ShareMode | null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  // Ressynchronisation quand le serveur renvoie un autre état.
  const [prev, setPrev] = useState({ token, mode });
  if (prev.token !== token || prev.mode !== mode) {
    setPrev({ token, mode });
    setCurrentToken(token);
    setCurrentMode(mode as ShareMode | null);
  }

  // URL absolue fournie par le serveur : copiable telle quelle.
  const url = currentToken ? `${baseUrl}/shared/novel/${currentToken}` : "";

  function changeMode(next: ShareMode) {
    if (next === currentMode) return;
    setError(null);
    startTransition(async () => {
      const res = await setNovelShare(novelId, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCurrentToken(res.token);
      setCurrentMode(next);
      toast("Mode de partage mis à jour.");
      router.refresh();
    });
  }

  function revoke() {
    setError(null);
    startTransition(async () => {
      const res = await setNovelShare(novelId, null);
      if (!res.ok) {
        setError(res.error);
        setConfirmRevoke(false);
        return;
      }
      setCurrentToken(null);
      setCurrentMode(null);
      setConfirmRevoke(false);
      setOpen(false);
      toast("Partage révoqué.");
      router.refresh();
    });
  }

  async function copy() {
    if (!currentToken) return;
    try {
      await navigator.clipboard.writeText(url);
      toast("Lien copié");
    } catch {
      toast("Copie impossible — sélectionnez le lien manuellement.");
    }
  }

  return (
    <>
      <button type="button" className="btn self-stretch px-3 text-xs" onClick={() => setOpen(true)}>
        <ShareIcon />
        Partage
      </button>

      <GameModal open={open} onClose={() => setOpen(false)} label="Partage du roman">
        <div className="flex flex-col gap-4">
          {currentToken ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">
                Toute personne disposant de ce lien peut y accéder selon le mode choisi.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={url}
                  aria-label="Lien de partage"
                  className="input min-w-0 flex-1 text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="btn btn-primary px-3 py-2 text-xs"
                  onClick={() => void copy()}
                >
                  <CopyIcon />
                  Copier
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Choisissez un mode pour générer un lien de partage.
            </p>
          )}

          <div className="flex flex-col gap-2" role="group" aria-label="Mode de partage">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={currentMode === m.value}
                disabled={busy}
                onClick={() => changeMode(m.value)}
                className={`panel flex flex-col items-start gap-1 px-4 py-3 text-left transition ${
                  currentMode === m.value
                    ? "border-accent"
                    : "hover:bg-card-hover disabled:opacity-60"
                }`}
              >
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-xs text-muted">{m.hint}</span>
              </button>
            ))}
          </div>

          {currentToken && (
            <>
              <p className="text-xs text-muted">
                Le passage en mode Éditeur génère un nouveau lien. Rétrograder ou révoquer retire
                l&apos;accès des éditeurs déjà inscrits.
              </p>
              {confirmRevoke ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted">Révoquer ce lien ?</span>
                  <button
                    type="button"
                    className="btn btn-broken px-3 py-2 text-xs"
                    disabled={busy}
                    onClick={revoke}
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    className="btn px-3 py-2 text-xs"
                    disabled={busy}
                    onClick={() => setConfirmRevoke(false)}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    className="btn px-3 py-2 text-xs text-destructive"
                    disabled={busy}
                    onClick={() => setConfirmRevoke(true)}
                  >
                    Révoquer
                  </button>
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </GameModal>
    </>
  );
}
