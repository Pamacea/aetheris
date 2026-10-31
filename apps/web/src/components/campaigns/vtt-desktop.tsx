"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CAMPAIGN_MODULES, OPEN_MODULE_EVENT } from "./campaign-modules";

/** Fenêtres du bureau VTT, persistées par campagne (sans le z-index). */
type WindowState = {
  x: number;
  y: number;
  w: number;
  h: number;
  maximized: boolean;
  z: number;
};

const DOCK_MODULES = CAMPAIGN_MODULES.filter((mod) => mod.slug !== "vtt");

/**
 * Bureau de la table de jeu : la table reste la page de fond, les modules
 * s'ouvrent dans des fenêtres déplaçables (iframe same-origin, donc les
 * Server Components existants ne bougent pas). Le top-nav est l'unique
 * lanceur de modules ; les routes modules ouvertes en direct redirigent
 * ici avec `?open=<slug>`.
 */
export function VttDesktop({
  campaignId,
  children,
}: {
  campaignId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [windows, setWindows] = useState<Record<string, WindowState>>({});
  const [loaded, setLoaded] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  const topZ = useRef(0);
  const storageKey = `aetheris:vtt-desktop:${campaignId}`;

  // Restaure après hydratation (le rendu serveur doit rester vide). Le
  // setTimeout sort la mise à jour du corps de l'effet (rendu en cascade).
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "null") as unknown;
        if (parsed && typeof parsed === "object") {
          const next: Record<string, WindowState> = {};
          for (const mod of DOCK_MODULES) {
            const raw = (parsed as Record<string, unknown>)[mod.slug];
            if (!raw || typeof raw !== "object") continue;
            const r = raw as Record<string, unknown>;
            if (![r.x, r.y, r.w, r.h].every((n) => typeof n === "number" && Number.isFinite(n))) {
              continue;
            }
            next[mod.slug] = {
              x: r.x as number,
              y: r.y as number,
              w: r.w as number,
              h: r.h as number,
              maximized: r.maximized === true,
              z: ++topZ.current,
            };
          }
          setWindows(next);
        }
      } catch {
        // localStorage corrompu : on repart d'un bureau vide.
      }
      setLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [storageKey]);

  // Persistance légère et débouncée (le drag écrit à chaque pointermove).
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      const data = Object.fromEntries(
        Object.entries(windows).map(([slug, { x, y, w, h, maximized }]) => [
          slug,
          { x, y, w, h, maximized },
        ]),
      );
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        // quota / mode privé : le bureau fonctionne sans persistance.
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [windows, loaded, storageKey]);

  const open = useCallback((slug: string) => {
    setWindows((prev) => {
      const z = ++topZ.current;
      const existing = prev[slug];
      if (existing) return { ...prev, [slug]: { ...existing, z } };
      const area = areaRef.current?.getBoundingClientRect();
      const availW = Math.max(320, (area?.width ?? 1200) - 48);
      const availH = Math.max(220, (area?.height ?? 720) - 48);
      const w = Math.min(880, availW);
      const h = Math.min(620, availH);
      const step = Object.keys(prev).length % 8;
      return {
        ...prev,
        [slug]: {
          x: Math.min(24 + step * 32, Math.max(0, availW - w)),
          y: Math.min(24 + step * 28, Math.max(0, availH - h)),
          w,
          h,
          maximized: false,
          z,
        },
      };
    });
  }, []);

  // Pixi ne se redimensionne qu'au `resize` de la fenêtre : répercuter les
  // changements de taille de la table (barres d'outils, panneaux) pour que
  // le canvas suive la zone au lieu de déborder.
  useEffect(() => {
    const host = areaRef.current?.querySelector('[aria-label="Table de jeu"]');
    if (!host) return;
    const observer = new ResizeObserver(() => window.dispatchEvent(new Event("resize")));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // Le top-nav émet cet événement quand on est sur la table.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const slug = (event as CustomEvent<unknown>).detail;
      if (typeof slug === "string" && DOCK_MODULES.some((mod) => mod.slug === slug)) open(slug);
    };
    window.addEventListener(OPEN_MODULE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MODULE_EVENT, onOpen);
  }, [open]);

  // Lien direct `/vtt?open=<slug>` (redirection depuis une route module) :
  // ouvre la fenêtre une fois le bureau restauré, puis nettoie l'URL pour
  // qu'un reload ne la rouvre pas.
  useEffect(() => {
    if (!loaded) return;
    const slug = new URLSearchParams(window.location.search).get("open");
    if (!slug) return;
    if (DOCK_MODULES.some((mod) => mod.slug === slug)) open(slug);
    router.replace(`/campaign/${encodeURIComponent(campaignId)}/vtt`, { scroll: false });
  }, [loaded, open, router, campaignId]);

  const raise = useCallback((slug: string) => {
    setWindows((prev) => {
      const win = prev[slug];
      if (!win || win.z === topZ.current) return prev;
      return { ...prev, [slug]: { ...win, z: ++topZ.current } };
    });
  }, []);

  const close = (slug: string) => {
    setWindows((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  };

  const toggleMaximize = (slug: string) => {
    setWindows((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], maximized: !prev[slug].maximized },
    }));
  };

  const startDrag = (event: React.PointerEvent<HTMLElement>, slug: string) => {
    const win = windows[slug];
    if (!win || win.maximized) return;
    const area = areaRef.current;
    if (!area) return;
    event.preventDefault();
    const el = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;
    const { width, height } = area.getBoundingClientRect();
    el.setPointerCapture(event.pointerId);
    setInteracting(true);

    const onMove = (ev: PointerEvent) => {
      const x = Math.max(0, Math.min(win.x + ev.clientX - startX, Math.max(0, width - win.w)));
      const y = Math.max(0, Math.min(win.y + ev.clientY - startY, Math.max(0, height - win.h)));
      setWindows((prev) => ({ ...prev, [slug]: { ...prev[slug], x, y } }));
    };
    const onUp = () => {
      el.releasePointerCapture?.(event.pointerId);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      setInteracting(false);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  };

  const startResize = (event: React.PointerEvent<HTMLElement>, slug: string) => {
    const win = windows[slug];
    if (!win || win.maximized) return;
    const area = areaRef.current;
    if (!area) return;
    event.preventDefault();
    event.stopPropagation();
    const el = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;
    const { width, height } = area.getBoundingClientRect();
    el.setPointerCapture(event.pointerId);
    setInteracting(true);

    const onMove = (ev: PointerEvent) => {
      const w = Math.max(320, Math.min(win.w + ev.clientX - startX, Math.max(320, width - win.x)));
      const h = Math.max(200, Math.min(win.h + ev.clientY - startY, Math.max(200, height - win.y)));
      setWindows((prev) => ({ ...prev, [slug]: { ...prev[slug], w, h } }));
    };
    const onUp = () => {
      el.releasePointerCapture?.(event.pointerId);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      setInteracting(false);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  };

  const labelOf = (slug: string) =>
    CAMPAIGN_MODULES.find((mod) => mod.slug === slug)?.label ?? slug;

  return (
    <div
      ref={areaRef}
      className={`relative flex min-h-0 flex-1 overflow-hidden [&_[aria-label='Table_de_jeu']]:min-w-0 ${interacting ? "[&_iframe]:pointer-events-none" : ""}`}
    >
      {children}

      {/* Dock flottant : un clic ouvre, un second ferme. Au-dessus des
          fenêtres (z très haut) pour rester le lanceur permanent. */}
      <nav
        aria-label="Dock des modules"
        className="absolute bottom-3 left-1/2 z-[9999] flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 gap-0.5 overflow-x-auto border border-border bg-background/95 p-1 shadow-lg backdrop-blur"
      >
        {DOCK_MODULES.map((mod) => {
          const isOpen = Boolean(windows[mod.slug]);
          return (
            <button
              key={mod.slug}
              type="button"
              aria-pressed={isOpen}
              onClick={() => (isOpen ? close(mod.slug) : open(mod.slug))}
              title={isOpen ? `Fermer ${mod.label}` : `Ouvrir ${mod.label}`}
              className={`shrink-0 px-2 py-1 text-[0.6rem] tracking-widest uppercase transition ${
                isOpen
                  ? "text-accent underline underline-offset-4"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {mod.label}
            </button>
          );
        })}
      </nav>

      {Object.entries(windows).map(([slug, win]) => {
        return (
          <section
            key={slug}
            data-desktop-window={slug}
            role="dialog"
            aria-label={`Fenêtre ${labelOf(slug)}`}
            onPointerDown={() => raise(slug)}
            className="absolute flex flex-col overflow-hidden border border-border bg-background shadow-2xl"
            style={
              win.maximized
                ? {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 100 + win.z,
                  }
                : {
                    position: "absolute",
                    left: win.x,
                    top: win.y,
                    width: win.w,
                    height: win.h,
                    zIndex: 100 + win.z,
                  }
            }
          >
            <header
              data-window-title
              onPointerDown={(event) => startDrag(event, slug)}
              onDoubleClick={() => toggleMaximize(slug)}
              className="flex h-8 shrink-0 cursor-grab touch-none items-center gap-2 border-b border-border bg-card px-2 select-none"
            >
              <span className="truncate text-[0.7rem] tracking-widest text-muted uppercase">
                {labelOf(slug)}
              </span>
              <span className="ml-auto flex items-center">
                <button
                  type="button"
                  aria-label={`Fermer ${labelOf(slug)}`}
                  onClick={() => close(slug)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="px-2 py-0.5 text-xs text-muted hover:text-destructive"
                >
                  ✕
                </button>
              </span>
            </header>
            <iframe
              title={`Module ${labelOf(slug)}`}
              src={`/campaign/${encodeURIComponent(campaignId)}/${slug}?embed=1`}
              className="min-h-0 w-full flex-1 border-0 bg-background"
            />
            <div
              data-resize-handle
              role="separator"
              aria-label={`Redimensionner ${labelOf(slug)}`}
              onPointerDown={(event) => startResize(event, slug)}
              className="absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize bg-accent/40"
            />
          </section>
        );
      })}
    </div>
  );
}
