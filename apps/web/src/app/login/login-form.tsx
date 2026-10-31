"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "@/lib/auth-client";
import { SocialAuthButtons, type SocialProvider } from "@/components/social-auth-buttons";

export function LoginForm({ providers }: { providers: SocialProvider[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const { error } = await signIn.email({
        email: String(fd.get("email")),
        password: String(fd.get("password")),
      });
      if (error) {
        setError(error.message ?? "Identifiants invalides.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Connexion impossible. Réessayez.");
    } finally {
      setPending(false);
    }
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
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
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
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
          </label>
          {error && (
            <p id="login-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary btn-broken mt-2 w-full"
          >
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <SocialAuthButtons providers={providers} />
      </main>
    </div>
  );
}
