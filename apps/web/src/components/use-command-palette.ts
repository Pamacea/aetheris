"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildCommands, fold, type Command, type PaletteEntry } from "./command-palette-commands";

/**
 * État + raccourcis de la palette de commandes (Ctrl/Cmd+K) :
 * extraits du composant pour le garder sous le budget hooks.
 * Pas de useMemo (règle projet : mesurer avant de mémoriser — la liste reste
 * courte : commandes statiques + 20 campagnes + 20 romans maximum).
 */
type PaletteData = {
  campaigns: PaletteEntry[];
  novels: PaletteEntry[];
};

export function useCommandPalette({ campaigns, novels }: PaletteData) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const commands = buildCommands(router, campaigns, novels);
  const q = fold(query.trim());
  const filtered = q
    ? commands.filter((c) => fold(c.label).includes(q) || fold(c.keywords).includes(q))
    : commands;

  function openPalette() {
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Focus d'origine (bouton ⌘K ou élément actif via Ctrl+K) à restaurer.
    const previous = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (previous && previous !== document.body && previous.isConnected) {
        previous.focus();
      }
    };
  }, [open]);

  const activeClamped = Math.min(active, Math.max(filtered.length - 1, 0));

  // Option active toujours visible au clavier (↑↓).
  useEffect(() => {
    if (!open) return;
    // Les en-têtes de groupe sont aussi des <li> : viser l'option active, pas l'index DOM.
    listRef.current
      ?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeClamped]);

  function execute(cmd: Command) {
    setOpen(false);
    cmd.run();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeClamped];
      if (cmd) execute(cmd);
    } else if (e.key === "Tab") {
      // Piège : la saisie est le seul foyer du dialog, Tab ne sort pas.
      e.preventDefault();
    }
  }

  return {
    open,
    close: () => setOpen(false),
    openPalette,
    query,
    setQuery,
    activeClamped,
    inputRef,
    listRef,
    filtered,
    execute,
    onKeyDown,
    onActiveChange: setActive,
  };
}
