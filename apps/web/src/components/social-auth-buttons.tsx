"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";

export type SocialProvider = "discord" | "github";

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  discord: "Discord",
  github: "GitHub",
};

/** Boutons « Continuer avec … » partagés par la connexion et l'inscription. */
export function SocialAuthButtons({
  providers,
  callbackURL = "/dashboard",
}: {
  providers: SocialProvider[];
  callbackURL?: string;
}) {
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  async function onSocial(provider: SocialProvider) {
    setPending(provider);
    setError(null);
    try {
      const { error: signInError } = await signIn.social({ provider, callbackURL });
      if (signInError) {
        setError(signInError.message ?? `Connexion ${PROVIDER_LABELS[provider]} impossible.`);
      }
    } catch {
      setError(`Connexion ${PROVIDER_LABELS[provider]} impossible.`);
    } finally {
      // en cas d'échec (redirect annulé) :
      setPending(null);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex items-center gap-3 text-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="text-[0.65rem] tracking-[0.25em] uppercase">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-2">
        {providers.map((provider) => (
          <button
            key={provider}
            type="button"
            disabled={pending !== null}
            onClick={() => onSocial(provider)}
            className="btn w-full"
          >
            {pending === provider ? "Redirection…" : `Continuer avec ${PROVIDER_LABELS[provider]}`}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
