"use client";

import { useEffect } from "react";
import { THEME_PRESETS } from "@/features/campaign-settings/theme-editor-constants";

export const USER_THEME_STORAGE_KEY = "aetheris:user-theme";
export const USER_THEME_EVENT = "aetheris:theme-change";

/** Variables posées en inline sur <html> au dernier apply, pour les retirer. */
const applied = new Set<string>();

function clearTheme(root: HTMLElement) {
  for (const name of applied) root.style.removeProperty(name);
  applied.clear();
  root.style.removeProperty("color-scheme");
}

function applyTheme(id: string | null) {
  const root = document.documentElement;
  clearTheme(root);

  const preset = THEME_PRESETS.find((item) => item.id === id);
  if (!preset?.css) return; // absent ou « défaut » : les tokens de globals.css reprennent

  for (const match of preset.css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    const name = `--${match[1]}`;
    root.style.setProperty(name, match[2].trim());
    applied.add(name);
  }

  const scheme = /color-scheme\s*:\s*(light|dark)/i.exec(preset.css)?.[1];
  if (scheme) root.style.colorScheme = scheme;
}

function storedTheme(): string | null {
  try {
    return localStorage.getItem(USER_THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Applique le thème d'interface choisi dans le profil (localStorage).
 * Monté une fois dans le layout racine ; réagit à l'event émis par le sélecteur.
 */
export function UserTheme() {
  useEffect(() => {
    applyTheme(storedTheme());
    const onChange = () => applyTheme(storedTheme());
    window.addEventListener(USER_THEME_EVENT, onChange);
    return () => window.removeEventListener(USER_THEME_EVENT, onChange);
  }, []);

  return null;
}
