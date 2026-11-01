"use client";

import { useRef, useState, type ReactElement } from "react";
import { MAX_UPLOAD_BYTES, UPLOAD_MESSAGES } from "@/lib/upload-validation";

/**
 * Champ image réutilisable : aperçu, envoi vers /api/uploads, retrait, et
 * repli URL http(s) (coller une image distante reste possible). Aucune
 * data-URI n'est produite ici : le serveur ne stocke que des URLs Blob.
 */
export function ImageUploadField(props: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  purpose: "map" | "token" | "cover" | "handout";
  hint?: string;
  compact?: boolean;
}): ReactElement {
  const { label, value, onChange, purpose, hint, compact = false } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    // Mêmes refus que le serveur, avant tout aller-retour réseau.
    if (!file.type.startsWith("image/")) {
      setError(UPLOAD_MESSAGES.notImage);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(UPLOAD_MESSAGES.tooLarge);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("purpose", purpose);
      body.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: unknown; error?: unknown };
      if (!res.ok || typeof data.url !== "string") {
        setError(typeof data.error === "string" ? data.error : "Envoi de l'image impossible.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Connexion perdue — réessayez.");
    } finally {
      setPending(false);
    }
  }

  const previewCls = compact ? "h-16 w-16" : "h-28 w-28";

  return (
    <div className="flex flex-col gap-2 text-xs text-muted">
      <span>{label}</span>
      <div className="flex items-start gap-3">
        <div className={`panel ${previewCls} shrink-0 overflow-hidden`}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl text-muted">
              <span className="mark-tri" style={{ marginRight: 0 }} aria-hidden />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn px-3 py-1.5 text-xs"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? "Envoi…" : value ? "Remplacer" : "Choisir un fichier"}
            </button>
            {value && (
              <button
                type="button"
                className="btn px-3 py-1.5 text-xs"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  onChange("");
                }}
              >
                Retirer
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
          </div>
          <input
            className="input"
            value={value}
            onChange={(e) => {
              setError(null);
              onChange(e.target.value);
            }}
            maxLength={2048}
            placeholder="https://… (ou collez une URL d'image)"
            aria-label={`${label} — URL de l'image`}
          />
          {hint && <span className="text-[0.65rem] text-muted">{hint}</span>}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
