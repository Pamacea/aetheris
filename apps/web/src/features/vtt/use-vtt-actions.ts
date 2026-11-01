"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { MAX_UPLOAD_BYTES, UPLOAD_MESSAGES } from "@/lib/upload-validation";
import { resolveMapUrl } from "./helpers";
import type {
  GridSettings,
  TokenState,
  VttApi,
  VttTool,
  WallLine,
  WallSelection,
  WallType,
} from "./types";

interface VttActionsParams {
  tool: VttTool;
  isGM: boolean;
  apiRef: { current: VttApi | null };
  objectUrlRef: { current: string | null };
  selectedId: string | null;
  walls: WallLine[];
  wallSelection: WallSelection | null;
  wallType: WallType;
  setGrid: Dispatch<SetStateAction<GridSettings>>;
  setMapUrl: Dispatch<SetStateAction<string | null>>;
  setMapPreview: Dispatch<SetStateAction<string | null>>;
  setTokens: Dispatch<SetStateAction<TokenState[]>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setWalls: Dispatch<SetStateAction<WallLine[]>>;
  setWallSelection: Dispatch<SetStateAction<WallSelection | null>>;
  /** Annule/rétablit une action de scène ; false si la pile est vide. */
  undo: () => boolean;
  redo: () => boolean;
}

/** Sélecteur « champ de saisie » : les raccourcis ne doivent pas s'y appliquer. */
function isEditable(el: Element | null): boolean {
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el instanceof HTMLSelectElement ||
      (el as HTMLElement).isContentEditable)
  );
}

/**
 * Handlers des barres d'outils + raccourcis clavier (Suppr = jeton ou
 * sommet/mur sélectionné, Entrée/Échap sur l'outil Murs).
 * Joueurs exclus : création/suppression restent MJ (outils déjà filtrés).
 */
export function useVttActions({
  tool,
  isGM,
  apiRef,
  objectUrlRef,
  selectedId,
  walls,
  wallSelection,
  wallType,
  setGrid,
  setMapUrl,
  setMapPreview,
  setTokens,
  setSelectedId,
  setWalls,
  setWallSelection,
  undo,
  redo,
}: VttActionsParams) {
  const [mapUploadError, setMapUploadError] = useState<string | null>(null);

  const revokePreview = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  };

  /** Aperçu local de secours : stockage indisponible, rien n'est commité. */
  const showLocalPreview = (file: File) => {
    revokePreview();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setMapPreview(url);
  };

  /**
   * Fichier local : envoi vers Blob puis commit de `mapUrl` avec l'URL reçue.
   * Échec (503 sans token, réseau…) → aperçu local conservé, aucun commit.
   */
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMapUploadError(null);

    if (!file.type.startsWith("image/")) {
      setMapUploadError(UPLOAD_MESSAGES.notImage);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setMapUploadError(UPLOAD_MESSAGES.tooLarge);
      return;
    }

    const body = new FormData();
    body.set("purpose", "map");
    body.set("file", file);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: unknown; error?: unknown };
      if (!res.ok || typeof data.url !== "string") {
        showLocalPreview(file);
        setMapUploadError(
          typeof data.error === "string" ? data.error : "Envoi de l'image impossible.",
        );
        return;
      }
      applyMap(data.url);
    } catch {
      showLocalPreview(file);
      setMapUploadError("Connexion perdue — réessayez.");
    }
  };

  /** URL distante : seule valeur persistée et synchronisée. */
  const applyMap = (raw: string): boolean => {
    const url = resolveMapUrl(raw);
    if (!url) return false;
    revokePreview();
    setMapPreview(null);
    setMapUrl(url);
    setMapUploadError(null);
    return true;
  };

  const removeMap = () => {
    revokePreview();
    setMapPreview(null);
    setMapUrl(null);
    setMapUploadError(null);
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

  /** Supprime le sommet sélectionné (mur entier si un seul sommet resterait). */
  const deleteWallSelection = (selection: WallSelection | null = wallSelection) => {
    if (!selection) return;
    const target = walls.find((w) => w.id === selection.wallId);
    if (!target) {
      setWallSelection(null);
      return;
    }
    if (selection.vertex === null) {
      setWalls(walls.filter((w) => w.id !== target.id));
    } else {
      const points = target.points.filter((_, i) => i !== selection.vertex);
      setWalls(
        points.length >= 2
          ? walls.map((w) => (w.id === target.id ? { ...w, points } : w))
          : walls.filter((w) => w.id !== target.id),
      );
    }
    setWallSelection(null);
    apiRef.current?.setWallSelection(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(document.activeElement)) return;
      // Annuler/rétablir : Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z ou Ctrl/Cmd+Y.
      const mod = (e.ctrlKey || e.metaKey) && !e.altKey;
      const key = e.key.toLowerCase();
      if (mod && (key === "z" || key === "y")) {
        if (!isGM) return; // aucun raccourci d'historique pour un joueur
        const isRedo = key === "y" || e.shiftKey;
        if ((isRedo ? redo : undo)()) e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        if (tool === "wall") apiRef.current?.cancelDraft();
        if (wallSelection) {
          setWallSelection(null);
          apiRef.current?.setWallSelection(null);
        }
        return;
      }
      if (tool === "wall" && e.key === "Enter") {
        e.preventDefault();
        apiRef.current?.finishDraft(wallType);
        return;
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (wallSelection) {
        e.preventDefault();
        deleteWallSelection();
        return;
      }
      if (!isGM || !selectedId) return;
      e.preventDefault();
      setTokens((ts) => ts.filter((t) => t.id !== selectedId));
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Déclassement du blob URL de la carte au démontage (créé par onFileChange).
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [objectUrlRef]);

  return {
    mapUploadError,
    onFileChange,
    applyMap,
    removeMap,
    setGridNum,
    updateToken,
    deleteToken,
    setTokenNum,
    deleteWallSelection,
  };
}
