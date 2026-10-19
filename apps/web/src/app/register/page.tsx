"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signUp } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { error } = await signUp.email({
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    if (error) {
      setError(error.message ?? "Impossible de créer le compte.");
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <main className="panel panel-form p-8">
        <h1 className="mb-1 text-2xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Inscription
        </h1>
        <p className="mb-6 text-sm text-muted">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="text-accent underline decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            Se connecter
          </Link>
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            Nom
            <input
              name="name"
              type="text"
              required
              maxLength={80}
              autoComplete="name"
              className="input"
            />
          </label>
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
              autoComplete="new-password"
              className="input"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary btn-broken mt-2 w-full"
          >
            {pending ? "Création…" : "Créer mon compte"}
          </button>
        </form>
      </main>
    </div>
  );
}
