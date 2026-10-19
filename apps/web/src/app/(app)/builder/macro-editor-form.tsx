"use client";

import type { Macro } from "./macro-editor-storage";

export function MacroEditorForm({
  connected,
  macros,
  currentId,
  name,
  source,
  output,
  error,
  pending,
  newMacro,
  select,
  save,
  remove,
  test,
  execute,
  setName,
  setSource,
}: {
  connected: boolean;
  macros: Macro[];
  currentId: string | null;
  name: string;
  source: string;
  output: string | null;
  error: string | null;
  pending: boolean;
  newMacro: () => void;
  select: (m: Macro) => void;
  save: () => void;
  remove: () => void;
  test: () => void;
  execute: () => void;
  setName: (v: string) => void;
  setSource: (v: string) => void;
}) {
  return (
    <div className="panel flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {connected ? "Chat connecté" : "Connexion au chat…"} — macros stockées dans ce navigateur
          (localStorage), exécutées en sandbox.
        </p>
        <button type="button" className="btn px-3 py-1.5 text-xs" onClick={newMacro}>
          + Nouvelle macro
        </button>
      </div>

      {macros.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {macros.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => select(m)}
                className={`border px-3 py-1.5 text-xs transition-colors ${
                  m.id === currentId
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:border-accent/60 hover:text-foreground"
                }`}
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Nom</span>
          <input
            id="macro-name"
            name="name"
            autoComplete="off"
            className="input"
            value={name}
            maxLength={80}
            placeholder="Ex. Attaque lourde"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label
            htmlFor="macro-source"
            className="text-[0.7rem] tracking-[0.2em] text-muted uppercase"
          >
            Corps JS (doit retourner la commande)
          </label>
          <textarea
            id="macro-source"
            className="input min-h-40 resize-y font-mono text-xs"
            value={source}
            spellCheck={false}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn px-3 py-1.5 text-xs"
          disabled={pending || !name.trim()}
          onClick={save}
        >
          Enregistrer
        </button>
        <button
          type="button"
          className="btn px-3 py-1.5 text-xs"
          disabled={pending || !currentId}
          onClick={remove}
        >
          Supprimer
        </button>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <button type="button" className="btn px-3 py-1.5 text-xs" disabled={pending} onClick={test}>
          Tester
        </button>
        <button
          type="button"
          className="btn btn-primary px-3 py-1.5 text-xs"
          disabled={pending}
          onClick={execute}
        >
          Exécuter au chat
        </button>
      </div>

      {output && (
        <p className="border border-accent/40 bg-accent/10 px-3 py-2 font-mono text-xs text-accent">
          {output}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
