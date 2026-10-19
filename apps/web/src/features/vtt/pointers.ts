import type { Container } from "pixi.js";
import { commitTokens, hitTokenAt } from "./apply";
import { redrawDraft, snapPoint, worldPoint } from "./draw";
import { newSceneToken } from "./helpers";
import type { VttBridge, VttSceneCtx } from "./types";

/**
 * Caméra / tokens : pan (outil « Vue » ou bouton du milieu), puis
 * sélection/drag (outil « Curseur ») et création (outil « Tokens »).
 * Les listeners vivent sur le canvas détruit avec l'app (pas de retrait).
 */
export function attachPointers(ctx: VttSceneCtx, bridge: VttBridge) {
  const canvas = ctx.instance.canvas;
  let panning = false;
  let lastX = 0;
  let lastY = 0;
  let dragging: {
    id: string;
    dx: number;
    dy: number;
    toX?: number;
    toY?: number;
  } | null = null;
  /** Dernier token:move émis (throttle ~60 ms pendant le drag). */
  let lastMoveEmit = 0;

  const onDown = (e: PointerEvent) => {
    const tool = bridge.toolRef.current;
    const middle = e.button === 1;
    if (middle || (e.button === 0 && tool === "pan")) {
      e.preventDefault();
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    // Outil « Murs » : chaque clic ajoute un sommet snappé à la polyigne.
    if (e.button === 0 && tool === "wall") {
      e.preventDefault();
      const w = worldPoint(canvas, ctx.world, e);
      const p = snapPoint(ctx.gridSettings, w.x, w.y);
      ctx.draft.push(p);
      ctx.draftCursor = p;
      bridge.setDraftCount(ctx.draft.length);
      redrawDraft(ctx.draftGfx, ctx.draft, ctx.draftCursor);
      return;
    }
    if (e.button !== 0 || (tool !== "select" && tool !== "token")) return;

    const w = worldPoint(canvas, ctx.world, e);
    const hit = hitTokenAt(ctx.tokenStates, w.x, w.y);
    if (hit) {
      e.preventDefault();
      dragging = { id: hit.id, dx: w.x - hit.x, dy: w.y - hit.y };
      commitTokens(ctx, bridge, ctx.tokenStates, hit.id);
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === "select") {
      if (ctx.selectedToken) commitTokens(ctx, bridge, ctx.tokenStates, null); // désélection
      return;
    }

    // Outil « Tokens » + clic sur le vide : créer (snappé sur la grille).
    const p = snapPoint(ctx.gridSettings, w.x, w.y);
    const t = newSceneToken(
      ctx.gridSettings,
      p,
      `Token ${ctx.tokenStates.length + 1}`,
      ctx.tokenStates.length,
    );
    e.preventDefault();
    commitTokens(ctx, bridge, [...ctx.tokenStates, t], t.id);
    dragging = { id: t.id, dx: 0, dy: 0 };
    canvas.setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent) => {
    if (panning) {
      ctx.world.x += e.clientX - lastX;
      ctx.world.y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      return;
    }
    if (ctx.draft.length > 0 && bridge.toolRef.current === "wall") {
      const w = worldPoint(canvas, ctx.world, e);
      ctx.draftCursor = snapPoint(ctx.gridSettings, w.x, w.y);
      redrawDraft(ctx.draftGfx, ctx.draft, ctx.draftCursor);
      return;
    }
    if (!dragging) return;
    const d = dragging;
    const w = worldPoint(canvas, ctx.world, e);
    const p = snapPoint(ctx.gridSettings, w.x - d.dx, w.y - d.dy);
    d.toX = p.x;
    d.toY = p.y;
    // Synchro continue du drag vers les autres clients (throttle).
    const now = performance.now();
    if (bridge.wsRef.current && now - lastMoveEmit > 60) {
      lastMoveEmit = now;
      bridge.wsRef.current.socket.emit("token:move", {
        campaignId: bridge.wsRef.current.campaignId,
        tokenId: d.id,
        x: p.x,
        y: p.y,
      });
    }
    const idx = ctx.tokenStates.findIndex((t) => t.id === d.id);
    if (idx < 0) return;
    const child = ctx.tokensLayer.children[idx] as Container | undefined;
    child?.position.set(p.x, p.y);
  };

  const onUp = (e: PointerEvent) => {
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    if (panning) {
      panning = false;
      return;
    }
    if (!dragging) return;
    const { id, toX, toY } = dragging;
    dragging = null;
    if (toX === undefined || toY === undefined) {
      // Simple clic : la sélection a déjà été appliquée au pointerdown.
      return;
    }
    commitTokens(
      ctx,
      bridge,
      ctx.tokenStates.map((t) => (t.id === id ? { ...t, x: toX, y: toY } : t)),
      id,
    );
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
}
