"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { GridSettings, TokenState, VttApi, VttTool } from "./types";

interface VttActionsParams {
  tool: VttTool;
  isGM: boolean;
  apiRef: { current: VttApi | null };
  objectUrlRef: { current: string | null };
  selectedId: string | null;
  setGrid: Dispatch<SetStateAction<GridSettings>>;
  setMapUrl: Dispatch<SetStateAction<string | null>>;
  setTokens: Dispatch<SetStateAction<TokenState[]>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
}

/**
 * Handlers de la barre d'outils, plus les raccourcis clavier
 * (Suppr = retirer le token sélectionné, Entrée/Échap sur l'outil Murs).
 * Joueurs exclus : création/suppression restent MJ (outils déjà filtrés).
 */
export function useVttActions({
  tool,
  isGM,
  apiRef,
  objectUrlRef,
  selectedId,
  setGrid,
  setMapUrl,
  setTokens,
  setSelectedId,
}: VttActionsParams) {
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setMapUrl(url);
    e.target.value = "";
  };

  const setGridNum = (key: "size" | "offsetX" | "offsetY", raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const min = key === "size" ? 16 : -4000;
    const max = key === "size" ? 512 : 4000;
    setGrid((g) => ({ ...g, [key]: Math.min(max, Math.max(min, Math.round(n))) }));
  };

  const updateToken = (id: string, patch: Partial<TokenState>) =>
    setTokens((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const deleteToken = (id: string) => {
    setTokens((ts) => ts.filter((t) => t.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const setTokenNum = (id: string, key: "size", raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    if (key === "size") updateToken(id, { size: Math.min(512, Math.max(16, Math.round(n))) });
  };

  // Suppression clavier du token sélectionné (hors champs de saisie) — MJ seul.
  useEffect(() => {
    if (!isGM || !selectedId) return;
    const id = selectedId;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const ae = document.activeElement;
      if (
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae instanceof HTMLSelectElement ||
          (ae as HTMLElement).isContentEditable)
      )
        return;
      e.preventDefault();
      setTokens((ts) => ts.filter((t) => t.id !== id));
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isGM, selectedId, setTokens, setSelectedId]);

  // Dessin de murs : Entrée valide la polyigne, Échap l'abandonne.
  useEffect(() => {
    if (tool !== "wall") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        apiRef.current?.finishDraft();
      } else if (e.key === "Escape") {
        e.preventDefault();
        apiRef.current?.cancelDraft();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, apiRef]);

  // Déclassement du blob URL de la carte au démontage (créé par onFileChange).
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [objectUrlRef]);

  return { onFileChange, setGridNum, updateToken, deleteToken, setTokenNum };
}
