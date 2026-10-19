"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateProfileName } from "./actions";

export function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfileName(formData);
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        Nom affiché
        <input
          name="name"
          required
          minLength={1}
          maxLength={80}
          defaultValue={initialName}
          autoComplete="name"
          className="input"
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-accent">Nom mis à jour.</p>}
      <div>
        <button type="submit" disabled={pending} className="btn btn-primary btn-broken">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
