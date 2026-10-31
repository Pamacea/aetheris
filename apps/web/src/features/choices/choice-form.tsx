"use client";

import { useState, useTransition } from "react";
import { createChoice } from "./actions";
import type { ChoiceView } from "./choice-view";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
/** Échec de transport de l'action : message local plutôt que l'error boundary. */
const NETWORK_ERROR = "Connexion perdue — réessayez.";

/** Création d'un choix (MJ) : prompt + 2..6 options, lancement immédiat (open). */
export function ChoiceForm({
  campaignId,
  onCreated,
}: {
  campaignId: string;
  onCreated: (choice: ChoiceView) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const valid =
    prompt.trim() !== "" && options.length >= MIN_OPTIONS && options.every((o) => o.trim() !== "");

  function setOption(index: number, value: string): void {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function removeOption(index: number): void {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await createChoice(campaignId, {
          prompt: prompt.trim(),
          options: options.map((o) => o.trim()),
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setPrompt("");
        setOptions(["", ""]);
        onCreated(res.choice);
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  }

  return (
    <form onSubmit={submit} className="panel flex flex-col gap-4 p-4">
      <h2 className="text-sm tracking-widest text-muted uppercase">Nouveau choix</h2>

      <label className="flex flex-col gap-1 text-xs text-muted">
        Question aux joueurs
        <input
          className="input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={500}
          placeholder="Quelle route prenons-nous ?"
          disabled={pending}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs tracking-widest text-muted uppercase">
          Options ({options.length}/{MAX_OPTIONS})
        </legend>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className="input"
              value={option}
              onChange={(e) => setOption(index, e.target.value)}
              maxLength={120}
              placeholder={`Option ${index + 1}`}
              disabled={pending}
            />
            <button
              type="button"
              className="btn border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
              disabled={pending || options.length <= MIN_OPTIONS}
              onClick={() => removeOption(index)}
              aria-label={`Retirer l'option ${index + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn px-3 py-1.5 text-xs"
          disabled={pending || options.length >= MAX_OPTIONS}
          onClick={() => setOptions((prev) => [...prev, ""])}
        >
          + Option
        </button>
        <button type="submit" className="btn btn-primary btn-tri" disabled={pending || !valid}>
          Lancer le choix
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </form>
  );
}
