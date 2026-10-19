"use client";

import { useState, useTransition } from "react";
import { deleteGameSystem, updateGameSystem } from "./actions";

type Row = { id: string; name: string; description: string | null };

/**
 * Liste des systèmes de jeu du joueur : renommage inline + suppression.
 * La création utilise `CreateGameSystemButton` (dialog du dashboard).
 */
export function GameSystems({ systems }: { systems: Row[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function startEdit(s: Row) {
    setError(null);
    setEditingId(s.id);
    setName(s.name);
    setDescription(s.description ?? "");
  }

  function cancelEdit() {
    if (pending) return;
    setEditingId(null);
    setError(null);
  }

  function save() {
    if (!editingId) return;
    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
    };
    setError(null);
    startTransition(async () => {
      const res = await updateGameSystem(editingId, input);
      if (res.ok) setEditingId(null);
      else setError(res.error);
    });
  }

  function remove(s: Row) {
    if (!window.confirm(`Supprimer le système « ${s.name} » ?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteGameSystem(s.id);
      if (!res.ok) setError(res.error);
    });
  }

  if (systems.length === 0) {
    return (
      <p className="panel px-4 py-8 text-center text-sm text-muted">
        Aucun système de jeu. Créez-en un pour vos feuilles, objets et cartes&nbsp;!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-3 sm:grid-cols-2">
        {systems.map((s) => (
          <li key={s.id} className="panel flex flex-col gap-3 p-4">
            {editingId === s.id ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Nom</span>
                  <input
                    className="input"
                    name="nom-systeme"
                    value={name}
                    maxLength={80}
                    autoFocus
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
                    Description
                  </span>
                  <textarea
                    className="input resize-none"
                    name="description-systeme"
                    rows={2}
                    maxLength={500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
                <div className="mt-auto flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn px-3 py-1.5 text-xs"
                    disabled={pending}
                    onClick={cancelEdit}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary px-3 py-1.5 text-xs"
                    disabled={pending || !name.trim()}
                    onClick={save}
                  >
                    {pending ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="font-medium">{s.name}</span>
                  <p className="mt-1 text-xs text-muted">
                    {s.description ?? "Système personnalisé"}
                  </p>
                </div>
                <div className="mt-auto flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn px-3 py-1.5 text-xs"
                    disabled={pending}
                    onClick={() => startEdit(s)}
                  >
                    Renommer
                  </button>
                  <button
                    type="button"
                    className="btn px-3 py-1.5 text-xs text-destructive"
                    disabled={pending}
                    onClick={() => remove(s)}
                  >
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
