"use client";

import { useRef, useState, useTransition } from "react";
import { SYSTEM_GENRES, type CharacteristicType, type SystemGenre } from "@aetheris/shared";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { createCustomGameSystem, importCustomGameSystem } from "./actions";
import { SYSTEM_IMPORT_MAX_BYTES, parseSystemImport, systemExportPayload } from "./system-logic";
import type { GameSystemOption } from "./systems";

interface CharacteristicRow {
  name: string;
  type: CharacteristicType;
  formula: string;
}

const TYPE_LABELS: Record<CharacteristicType, string> = {
  text: "Texte",
  number: "Nombre",
  counter: "Compteur",
  formula: "Formule",
};

function downloadJson(name: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.trim() || "systeme"}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Révocation différée : certains navigateurs annulent le téléchargement sinon.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Homebrew System Builder : nom, genre et caractéristiques (nom/type/formule).
 * Les caractéristiques deviennent le modèle « Personnage » seedé dans les
 * campagnes qui choisissent ce système.
 */
export function SystemBuilder({
  onSaved,
  onCancel,
}: {
  onSaved: (system: GameSystemOption) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [genre, setGenre] = useState<SystemGenre>("fantasy");
  const [description, setDescription] = useState("");
  // Système personnalisé = page blanche : aucune caractéristique imposée.
  const [rows, setRows] = useState<CharacteristicRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function updateRow(index: number, patch: Partial<CharacteristicRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function payload() {
    return {
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      genre,
      characteristics: rows.map((row) => ({
        name: row.name.trim(),
        type: row.type,
        ...(row.type === "formula" ? { formula: row.formula.trim() } : {}),
      })),
    };
  }

  function save() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createCustomGameSystem(payload());
      if (result.ok) onSaved(result.system);
      else setError(result.error);
    });
  }

  function importFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    if (file.size > SYSTEM_IMPORT_MAX_BYTES) {
      setError("Fichier trop volumineux (200 Ko maximum).");
      return;
    }
    startTransition(async () => {
      const result = await importCustomGameSystem(await file.text());
      if (result.ok) onSaved(result.system);
      else setError(result.error);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nom du système
          <input
            className="input"
            value={name}
            maxLength={120}
            autoComplete="off"
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Système des Cendres"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Genre
          <select
            className="input"
            value={genre}
            onChange={(e) => setGenre(e.target.value as SystemGenre)}
          >
            {SYSTEM_GENRES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs text-muted">
        Description
        <textarea
          className="input min-h-16"
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Résumé du système, ton, particularités…"
        />
      </label>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
            Caractéristiques
          </span>
          <button
            type="button"
            className="btn px-2 py-1 text-xs"
            disabled={pending}
            onClick={() =>
              setRows((current) => [...current, { name: "", type: "number", formula: "" }])
            }
          >
            <PlusIcon className="mr-1 h-3 w-3" /> Ajouter
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {rows.length === 0 && (
            <li className="panel px-4 py-6 text-center text-xs text-muted">
              Page blanche. Ajoute une caractéristique pour commencer — rien n’est imposé.
            </li>
          )}
          {rows.map((row, index) => (
            <li key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_9rem_1fr_2rem]">
              <label className="flex flex-col gap-1 text-[0.65rem] text-muted">
                Nom
                <input
                  className="input input-sm"
                  value={row.name}
                  maxLength={80}
                  placeholder="Nom de la caractéristique"
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-[0.65rem] text-muted">
                Type
                <select
                  className="input input-sm"
                  value={row.type}
                  onChange={(e) => updateRow(index, { type: e.target.value as CharacteristicType })}
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {row.type === "formula" ? (
                <label className="flex flex-col gap-1 text-[0.65rem] text-muted">
                  Formule liée
                  <input
                    className="input input-sm"
                    value={row.formula}
                    maxLength={200}
                    placeholder="force + dexterite"
                    onChange={(e) => updateRow(index, { formula: e.target.value })}
                  />
                </label>
              ) : (
                <span className="hidden sm:block" />
              )}
              <button
                type="button"
                className="btn h-7 w-7 px-0 text-xs"
                title="Retirer cette caractéristique"
                aria-label={`Retirer ${row.name || "cette caractéristique"}`}
                disabled={pending || rows.length <= 1}
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {notice && <p className="text-xs text-accent">{notice}</p>}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="btn cursor-pointer px-3 py-1.5 text-xs"
            title="Importer un système depuis un fichier JSON"
          >
            Importer
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              disabled={pending}
              onChange={(e) => importFile(e.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            className="btn px-3 py-1.5 text-xs"
            disabled={pending || !name.trim()}
            onClick={() => {
              setError(null);
              setNotice(null);
              const parsed = parseSystemImport(systemExportPayload(payload()));
              if (!parsed.success) {
                setError(`Export impossible : ${parsed.error}`);
                return;
              }
              downloadJson(name, parsed.data);
              setNotice("Système exporté en JSON.");
            }}
          >
            Exporter
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn px-3 py-1.5 text-xs"
            disabled={pending}
            onClick={onCancel}
          >
            Retour
          </button>
          <button
            type="button"
            className="btn btn-primary btn-tri px-3 py-1.5 text-xs"
            disabled={pending || !name.trim()}
            onClick={save}
          >
            {pending ? "Enregistrement…" : "Enregistrer le système"}
          </button>
        </div>
      </footer>
    </div>
  );
}
