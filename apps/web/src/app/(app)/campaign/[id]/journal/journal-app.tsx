"use client";

import { useState, useTransition } from "react";
import { type Handout } from "@aetheris/shared";
import { createHandout, deleteHandout, updateHandout } from "./actions";
import { JournalDetail } from "./journal-detail";
import { JournalForm } from "./journal-form";
import { JournalList } from "./journal-list";
import { useJournalSync } from "./use-journal-sync";

type View =
  | { kind: "list" }
  | { kind: "detail"; id: string }
  | { kind: "form"; editingId?: string };

/**
 * Journal & Captures : handouts (texte + image) partagés par le MJ.
 * Les mutations émettent `journal:changed` via le relais générique —
 * les autres clients rafraîchissent leur vue server component.
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
  const { broadcastChanged } = useJournalSync(campaignId);
  const [view, setView] = useState<View>({ kind: "list" });
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate(): void {
    setTitle("");
    setImageUrl("");
    setContent("");
    setError(null);
    setView({ kind: "form" });
  }

  function openEdit(entry: Handout): void {
    setTitle(entry.title);
    setImageUrl(entry.imageUrl ?? "");
    setContent(entry.content);
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
      const res =
        view.kind === "form" && view.editingId
          ? await updateHandout(campaignId, view.editingId, payload)
          : await createHandout(campaignId, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      broadcastChanged();
      setView({ kind: "detail", id: res.id });
    });
  }

  function toggleShared(entry: Handout) {
    startTransition(async () => {
      const res = await updateHandout(campaignId, entry.id, {
        shared: !entry.shared,
      });
      if (!res.ok) setError(res.error);
      else broadcastChanged();
    });
  }

  function remove(entry: Handout) {
    if (!window.confirm(`Supprimer « ${entry.title} » ?`)) return;
    startTransition(async () => {
      const res = await deleteHandout(campaignId, entry.id);
      if (!res.ok) setError(res.error);
      else {
        broadcastChanged();
        setView({ kind: "list" });
      }
    });
  }

  const selected = view.kind === "detail" ? entries.find((e) => e.id === view.id) : undefined;

  // ── Détail d'un handout ──────────────────────────────────────────
  if (view.kind === "detail" && selected) {
    return (
      <JournalDetail
        entry={selected}
        isGM={isGM}
        pending={pending}
        error={error}
        onBack={() => setView({ kind: "list" })}
        onEdit={openEdit}
        onToggleShared={toggleShared}
        onRemove={remove}
      />
    );
  }

  // ── Formulaire création / édition ────────────────────────────────
  if (view.kind === "form") {
    return (
      <JournalForm
        editingId={view.editingId}
        title={title}
        setTitle={setTitle}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        content={content}
        setContent={setContent}
        error={error}
        pending={pending}
        onSubmit={submit}
        onCancel={() => setView({ kind: "list" })}
      />
    );
  }

  // ── Liste ────────────────────────────────────────────────────────
  return (
    <JournalList
      entries={entries}
      isGM={isGM}
      error={error}
      onSelect={(id) => setView({ kind: "detail", id })}
      onCreate={openCreate}
    />
  );
}
