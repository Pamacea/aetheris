"use client";

import { useActionState, useState } from "react";
import { SYSTEM_GENRES, type SystemGenre } from "@aetheris/shared";
import { GameModal } from "@/components/game-modal";
import { FeatherIcon, PlusIcon, RocketIcon, SkullIcon, SwordIcon } from "@/components/icons";
import { createCampaign, type CampaignFormState } from "@/features/campaigns/actions";
import { SystemBuilder } from "./system-builder";
import type { GameSystemOption } from "./systems";

function GenreIcon({ genre, className = "h-4 w-4" }: { genre: string; className?: string }) {
  switch (genre as SystemGenre) {
    case "fantasy":
      return <SwordIcon className={className} />;
    case "horreur":
      return <SkullIcon className={className} />;
    case "sci-fi":
      return <RocketIcon className={className} />;
    case "narratif":
      return <FeatherIcon className={className} />;
    default:
      return <PlusIcon className={className} />;
  }
}

function genreLabel(genre: string): string {
  return SYSTEM_GENRES.find((option) => option.id === genre)?.label ?? "Autre";
}

/**
 * Assistant de création : identité de la campagne, puis choix d'un système
 * (presets, homebrew existants ou création inline). La validation crée la
 * campagne et seed les modèles du système dans le wiki.
 */
export function CampaignWizard({ initialSystems }: { initialSystems: GameSystemOption[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [systems, setSystems] = useState(initialSystems);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<CampaignFormState, FormData>(
    (_prev, formData) => createCampaign(formData),
    null,
  );

  function reset() {
    setStep(1);
    setTitle("");
    setDescription("");
    setVisibility("private");
    setSelectedId(null);
    setBuilderOpen(false);
    setStepError(null);
  }

  function close() {
    if (pending) return;
    setOpen(false);
    reset();
  }

  function nextStep() {
    if (!title.trim()) {
      setStepError("Le titre de la campagne est requis.");
      return;
    }
    setStepError(null);
    setStep(2);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        className="btn btn-primary btn-tri px-4 py-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        + Nouvelle campagne
      </button>

      {open && (
        <GameModal open={open} onClose={close} label="Nouvelle campagne">
          <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="description" value={description} />
            <input type="hidden" name="visibility" value={visibility} />
            <input type="hidden" name="gameSystemId" value={selectedId ?? ""} />

            <ol className="flex items-center gap-3 text-[0.65rem] tracking-[0.2em] uppercase">
              <li className={step === 1 ? "text-accent" : "text-muted"}>1 · Identité</li>
              <li aria-hidden className="h-px flex-1 bg-border" />
              <li className={step === 2 ? "text-accent" : "text-muted"}>2 · Système</li>
            </ol>

            {step === 1 ? (
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5" htmlFor="new-campaign-title">
                  <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
                    Titre de la campagne
                  </span>
                  <input
                    id="new-campaign-title"
                    className="input"
                    placeholder="Titre de la campagne…"
                    maxLength={120}
                    autoComplete="off"
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1.5" htmlFor="new-campaign-description">
                  <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
                    Description
                  </span>
                  <textarea
                    id="new-campaign-description"
                    className="input min-h-20"
                    placeholder="Pitch, ambiance, promesse de campagne…"
                    maxLength={2_000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>

                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-[0.7rem] tracking-[0.2em] text-muted uppercase">
                    Visibilité
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ["private", "Privée", "Accessible sur invitation uniquement."],
                        ["public", "Publique", "Visible au-delà des membres invités."],
                      ] as const
                    ).map(([value, label, hint]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={visibility === value}
                        className={`panel flex flex-col gap-1 p-3 text-left text-xs ${
                          visibility === value
                            ? "border-accent bg-card-hover text-foreground"
                            : "text-muted hover:bg-card-hover"
                        }`}
                        onClick={() => setVisibility(value)}
                      >
                        <span className="font-medium text-foreground">{label}</span>
                        <span>{hint}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {stepError && <p className="text-xs text-destructive">{stepError}</p>}

                <footer className="flex justify-end gap-2">
                  <button type="button" onClick={close} className="btn px-3 py-1.5 text-xs">
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-tri px-4 py-1.5 text-xs"
                    onClick={nextStep}
                  >
                    Suivant
                  </button>
                </footer>
              </div>
            ) : builderOpen ? (
              <SystemBuilder
                onCancel={() => setBuilderOpen(false)}
                onSaved={(system) => {
                  setSystems((current) => [...current, system]);
                  setSelectedId(system.id);
                  setBuilderOpen(false);
                }}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-muted">
                  Choisissez le système qui fournira les modèles de fiches et les assets de base de
                  la campagne.
                </p>

                <div
                  role="radiogroup"
                  aria-label="Systèmes de jeu"
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {systems.map((system) => {
                    const selected = selectedId === system.id;
                    return (
                      <button
                        key={system.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`panel flex flex-col gap-2 p-3 text-left ${
                          selected
                            ? "border-accent bg-card-hover"
                            : "text-muted hover:bg-card-hover"
                        }`}
                        onClick={() => setSelectedId(system.id)}
                      >
                        <span className="flex items-center gap-2 text-foreground">
                          <GenreIcon genre={system.genre} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {system.name}
                          </span>
                          <span
                            className={`shrink-0 border px-1.5 py-0.5 text-[0.6rem] tracking-widest uppercase ${
                              system.isPreset
                                ? "border-accent/60 text-accent"
                                : "border-border text-muted"
                            }`}
                          >
                            {system.isPreset ? "Officiel" : "Homebrew"}
                          </span>
                        </span>
                        <span className="text-[0.65rem] tracking-[0.18em] uppercase">
                          {genreLabel(system.genre)}
                        </span>
                        {system.description && (
                          <span className="text-xs text-muted">{system.description}</span>
                        )}
                        {selected && <span className="text-xs text-accent">✓ Sélectionné</span>}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className="panel flex flex-col gap-2 p-3 text-left text-muted hover:bg-card-hover"
                    title="Créer un système homebrew"
                    onClick={() => setBuilderOpen(true)}
                  >
                    <span className="flex items-center gap-2 text-foreground">
                      <PlusIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">Système personnalisé</span>
                    </span>
                    <span className="text-xs">
                      Définissez vos caractéristiques, puis réutilisez le système dans vos
                      prochaines campagnes.
                    </span>
                  </button>
                </div>

                {state && <p className="text-xs text-destructive">{state.error}</p>}
                {!selectedId && !state && (
                  <p className="text-xs text-muted">Sélectionnez un système pour continuer.</p>
                )}

                <footer className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={pending}
                    className="btn px-3 py-1.5 text-xs"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-tri px-4 py-1.5 text-xs"
                    disabled={pending || !selectedId}
                  >
                    {pending ? "Création…" : "Créer la campagne"}
                  </button>
                </footer>
              </div>
            )}
          </form>
        </GameModal>
      )}
    </>
  );
}
