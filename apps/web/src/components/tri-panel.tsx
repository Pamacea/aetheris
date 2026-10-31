"use client";

import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { TriPanelLeft } from "./tri-panel-left";
import { TriPanelRight } from "./tri-panel-right";
import {
  MAX_WIDTH,
  MIN_WIDTH,
  getServerSnapshot,
  getSnapshot,
  persist,
  subscribe,
} from "./tri-panel-store";

/**
 * Layout tri-panneaux encrable (Phase 1) :
 * gauche = arborescence Lore, centre = zone basculable, droite = chat / dés.
 * Les largeurs se redimensionnent au drag et persistent dans localStorage ;
 * chaque panneau se réduit en rail (état persisté lui aussi).
 *
 * `leftPanel` remplace le contenu par défaut du panneau Lore (ex. : la
 * palette de notes glissables sur la table de jeu) ; `rightPanel` celui
 * du panneau Chat & Dés (ex. : le chat temps réel Phase 6).
 */
export function TriPanel({
  children,
  leftPanel,
  rightPanel,
}: {
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
}) {
  const panels = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { left, right, leftCollapsed, rightCollapsed } = panels;
  const pathname = usePathname();
  const campaignId = pathname.match(/^\/campaign\/([^/]+)/)?.[1];

  const toggle = (side: "left" | "right") =>
    persist(
      side === "left"
        ? { ...panels, leftCollapsed: !leftCollapsed }
        : { ...panels, rightCollapsed: !rightCollapsed },
    );

  const startDrag = useCallback(
    (side: "left" | "right") => (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = side === "left" ? left : right;
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        const next = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, startW + (side === "left" ? delta : -delta)),
        );
        persist(side === "left" ? { ...panels, left: next } : { ...panels, right: next });
      };
      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId);
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
      };
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
    },
    [left, right, panels],
  );

  return (
    <div className="flex min-h-0 flex-1">
      {/* Panneau gauche — arborescence Lore */}
      <TriPanelLeft
        collapsed={leftCollapsed}
        width={left}
        campaignId={campaignId}
        onToggle={() => toggle("left")}
        panel={leftPanel}
      />

      {!leftCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionner le panneau Lore"
          onPointerDown={startDrag("left")}
          className="hidden w-1 cursor-col-resize bg-border transition hover:bg-accent/60 md:block"
        />
      )}

      {/* Centre — zone basculable (VTT ↔ Éditeur). La table défile à la molette
          sans scrollbar native (DA « Pandémonium »). `contain: size` coupe la
          taille intrinsèque du canvas : sans lui, il force la page à défiler. */}
      <div className="no-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto [contain:size]">
        {children}
      </div>

      {!rightCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionner le panneau Chat"
          onPointerDown={startDrag("right")}
          className="hidden w-1 cursor-col-resize bg-border transition hover:bg-accent/60 md:block"
        />
      )}

      {/* Panneau droit — chat / dés / inspecteur */}
      <TriPanelRight
        collapsed={rightCollapsed}
        width={right}
        onToggle={() => toggle("right")}
        panel={rightPanel}
      />
    </div>
  );
}
