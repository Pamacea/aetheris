"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "@/lib/auth-client";

type SocialProvider = "discord" | "github";

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  discord: "Discord",
  github: "GitHub",
};

export function LoginForm({ providers }: { providers: SocialProvider[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { error } = await signIn.email({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    if (error) {
      setError(error.message ?? "Identifiants invalides.");
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onSocial(provider: SocialProvider) {
    setPendingProvider(provider);
    setError(null);
    await signIn.social({
      provider,
      callbackURL: "/dashboard",
    });
    // en cas d'échec (redirect annulé) :
    setPendingProvider(null);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <main className="panel panel-form p-8">
        <h1 className="mb-1 text-2xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Connexion
        </h1>
        <p className="mb-6 text-sm text-muted">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="text-accent underline decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            S&apos;inscrire
          </Link>
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            Email
            <input name="email" type="email" required autoComplete="email" className="input" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Mot de passe
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="input"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary btn-broken mt-2 w-full"
          >
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        {providers.length > 0 && (
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
                  disabled={pendingProvider !== null}
                  onClick={() => onSocial(provider)}
                  className="btn w-full"
                >
                  {pendingProvider === provider
                    ? "Redirection…"
                    : `Continuer avec ${PROVIDER_LABELS[provider]}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
