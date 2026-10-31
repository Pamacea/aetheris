"use client";

import { useRef, useState } from "react";
import { packFields } from "@aetheris/shared";
import type { WikiTemplateMeta } from "../types";
import { parseFields } from "./builder-field-factory";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type JsTest = { id: string; result?: string; error?: string } | null;

export function useBuilderState(initial: WikiTemplateMeta[], campaignId: string) {
  const [prev, setPrev] = useState(initial);
  const [items, setItems] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  // Test d'un champ « js » depuis l'éditeur de template (scope vide).
  const [jsTest, setJsTest] = useState<JsTest>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ key: string } | null>(null);
  // Config des champs repliée par défaut (⚙ la déplie) ; clé = id du champ
  // (un Set d'index se décalait à chaque insertion/suppression).
  const [openCfg, setOpenCfg] = useState<Set<string>>(new Set());

  // Resync depuis le serveur après chaque server action (revalidatePath).
  // Un brouillon local (drag/resize/saisie en cours) ne doit jamais être
  // écrasé par une réponse serveur plus ancienne : c'est l'autosave qui
  // republie l'état local.
  if (prev !== initial) {
    setPrev(initial);
    if (status !== "dirty" && status !== "saving") setItems(initial);
  }

  const selected = items.find((t) => t.id === selectedId) ?? items[0] ?? null;
  const fields = selected ? packFields(parseFields(selected)) : [];

  const categories = [
    ...new Set(items.map((t) => t.category).filter((c): c is string => !!c)),
  ].sort((a, b) => a.localeCompare(b, "fr"));

  const grouped = new Map<string, WikiTemplateMeta[]>();
  for (const t of items) {
    const key = t.category ?? "";
    const bucket = grouped.get(key);
    if (bucket) bucket.push(t);
    else grouped.set(key, [t]);
  }

  return {
    campaignId,
    items,
    setItems,
    selectedId,
    setSelectedId,
    status,
    setStatus,
    error,
    setError,
    notice,
    setNotice,
    newOpen,
    setNewOpen,
    newName,
    setNewName,
    newCategory,
    setNewCategory,
    jsTest,
    setJsTest,
    fileRef,
    listRef,
    drag,
    setDrag,
    openCfg,
    setOpenCfg,
    selected,
    fields,
    categories,
    grouped,
  };
}

export type BuilderState = ReturnType<typeof useBuilderState>;
