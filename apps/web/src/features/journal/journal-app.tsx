"use client";

import { useState, useTransition } from "react";
import type { Handout } from "@aetheris/shared";
import { createHandout, deleteHandout, updateHandout } from "./actions";

type View =
  | { kind: "list" }
  | { kind: "detail"; id: string }
  | { kind: "form"; editingId?: string };

type Filtre = "tous" | "partages" | "brouillons";

/** Échec de transport d'une Server Action (serveur coupé, réseau) : jamais
 *  laissé remonter à l'error boundary de Next, qui remplacerait le module. */
const NETWORK_ERROR = "Connexion perdue — réessayez.";

/**
 * Journal de bord : handouts (titre, contenu, image, partage) du MJ.
 * Pas de temps réel — server actions et leur revalidation suffisent.
 * Les joueurs reçoivent déjà la liste filtrée par la page serveur.
 */
export function JournalApp({
  campaignId,
  isGM,
  entries,
}: {
  campaignId: string;
  isGM: boolean;
  entries: Handout[];
}) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [pending, startTransition] = useTransition();

  // Pas de router.refresh() après mutation : revalidatePath() dans l'action
  // renvoie déjà l'arbre serveur rafraîchi (évite un 2e aller-retour).
  function openCreate(): void {
    setTitle("");
    setImageUrl("");
    setContent("");
    setShared(false);
    setError(null);
    setView({ kind: "form" });
  }

  function openEdit(entry: Handout): void {
    setTitle(entry.title);
    setImageUrl(entry.imageUrl ?? "");
    setContent(entry.content);
    setShared(entry.shared);
    setError(null);
    setView({ kind: "form", editingId: entry.id });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      title: title.trim(),
      content,
      imageUrl: imageUrl.trim() === "" ? null : imageUrl.trim(),
    };
    startTransition(async () => {
      try {
        const editingId = view.kind === "form" ? view.editingId : undefined;
        const res = editingId
          ? await updateHandout(campaignId, editingId, { ...payload, shared })
          : await createHandout(campaignId, { ...payload, shared });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setView({ kind: "detail", id: res.id });
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  }

  function toggleShared(entry: Handout) {
    startTransition(async () => {
      try {
        const res = await updateHandout(campaignId, entry.id, { shared: !entry.shared });
        if (!res.ok) setError(res.error);
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  }

  function remove(entry: Handout) {
    if (!window.confirm(`Supprimer « ${entry.title} » ?`)) return;
    startTransition(async () => {
      const res = await deleteHandout(campaignId, entry.id);
      if (!res.ok) setError(res.error);
      else setView({ kind: "list" });
    });
  }

  const selected = view.kind === "detail" ? entries.find((e) => e.id === view.id) : undefined;

  // ── Détail ───────────────────────────────────────────────────────
  if (view.kind === "detail" && selected) {
    return (
      <div className="flex flex-col gap-4">
        <button type="button" className="btn self-start" onClick={() => setView({ kind: "list" })}>
          ← Retour au journal
        </button>
        <article className="panel flex flex-col gap-4 p-5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl tracking-wide">{selected.title}</h2>
              <span className="text-[0.65rem] tracking-widest text-muted uppercase">
                {new Date(selected.createdAt).toLocaleDateString("fr-FR")}
                {isGM && (selected.shared ? " · Partagé" : " · Brouillon")}
              </span>
            </div>
            {isGM && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn"
                  disabled={pending}
                  onClick={() => openEdit(selected)}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={pending}
                  onClick={() => toggleShared(selected)}
                >
                  {selected.shared ? "Rendre privé" : "Partager"}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={pending}
                  onClick={() => remove(selected)}
                >
                  Supprimer
                </button>
              </div>
            )}
          </header>
          {selected.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.imageUrl}
              alt={selected.title}
              className="panel max-h-96 w-full object-contain"
            />
          )}
          {selected.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.content}</p>
          )}
        </article>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // ── Formulaire création / édition (MJ) ───────────────────────────
  if (view.kind === "form") {
    return (
      <form onSubmit={submit} className="panel-form flex w-full flex-col gap-4 p-5">
        <h2 className="text-xl tracking-wide">
          {view.editingId ? "Modifier le handout" : "Nouveau handout"}
        </h2>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Titre
          <input
            className="input"
            name="handout-titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={160}
            placeholder="La créature des marais…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Image (URL ou data-URI)
          <input
            className="input"
            name="handout-image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            maxLength={2048}
            placeholder="https://…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Contenu
          <textarea
            className="input min-h-48 resize-y"
            name="handout-contenu"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={10000}
            placeholder="Description, notes de MJ, récit…"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            name="handout-partage"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
          />
          Partagé aux joueurs
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending || title.trim() === ""}
          >
            {view.editingId ? "Enregistrer" : "Créer"}
          </button>
          <button
            type="button"
            className="btn"
            disabled={pending}
            onClick={() => setView({ kind: "list" })}
          >
            Annuler
          </button>
        </div>
      </form>
    );
  }

  // ── Liste ────────────────────────────────────────────────────────
  // Les joueurs n'ont qu'une cohorte (déjà filtrée serveur) : pas d'onglets.
  const listees = isGM
    ? entries.filter((e) => filtre === "tous" || (filtre === "partages" ? e.shared : !e.shared))
    : entries;

  return (
    <div className="flex flex-col gap-4">
      {isGM && (
        <nav aria-label="Filtres du journal" className="flex flex-wrap items-center gap-1">
          {(
            [
              ["tous", "Tous"],
              ["partages", "Partagés"],
              ["brouillons", "Brouillons"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltre(id)}
              aria-current={filtre === id ? "page" : undefined}
              className={
                filtre === id
                  ? "btn btn-primary px-3 py-1.5 text-xs"
                  : "btn border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
              }
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      <p className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>
          {listees.length} handout{listees.length > 1 ? "s" : ""}
          {!isGM && " partagés"}
        </span>
        {isGM && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Nouveau handout
          </button>
        )}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {listees.length === 0 ? (
        <p className="panel p-6 text-center text-sm text-muted">
          {!isGM
            ? "Le MJ n'a encore rien partagé."
            : entries.length === 0
              ? "Aucun handout — créez le premier (texte + image) pour le partager aux joueurs."
              : "Aucun handout dans ce filtre."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listees.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setView({ kind: "detail", id: e.id })}
                className="panel flex h-full w-full flex-col gap-2 p-4 text-left hover:bg-card-hover"
              >
                {e.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.imageUrl} alt="" className="h-28 w-full object-cover" />
                )}
                <span className="font-medium">{e.title}</span>
                <span className="line-clamp-2 text-xs text-muted">{e.content || "—"}</span>
                {isGM && (
                  <span
                    className={`mt-auto text-[0.65rem] tracking-widest uppercase ${
                      e.shared ? "text-accent" : "text-muted"
                    }`}
                  >
                    {e.shared ? "Partagé" : "Brouillon"}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
