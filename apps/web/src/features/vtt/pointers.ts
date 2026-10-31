import type { Container } from "pixi.js";
import { commitTokens, hitTokenAt } from "./apply";
import {
  hitWallSegment,
  nearestVertex,
  redrawDraft,
  redrawWalls,
  snapPoint,
  snapWallPoint,
  worldPoint,
} from "./draw";
import { scheduleFog } from "./fog";
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
  /** Sommet de mur en cours de déplacement. */
  let draggingWall: { wallId: string; index: number } | null = null;
  /** Dernier token:move émis (throttle ~60 ms pendant le drag). */
  let lastMoveEmit = 0;

  /** Sélection de mur/sommet partagée React ↔ Pixi (surbrillance immédiate). */
  const selectWall = (sel: VttSceneCtx["wallSelection"]) => {
    ctx.wallSelection = sel;
    bridge.setWallSelection(sel);
    redrawWalls(ctx.wallGfx, ctx.wallStates, ctx.isGM, sel);
  };

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
    // Outil « Murs » : tracé continu (sommet snappé à chaque clic), ou
    // sélection d'un sommet/mur existant quand aucun tracé n'est en cours.
    if (e.button === 0 && tool === "wall") {
      e.preventDefault();
      const w = worldPoint(canvas, ctx.world, e);
      const scale = ctx.world.scale.x || 1;
      if (ctx.draft.length === 0) {
        const vertex = nearestVertex(ctx.wallStates, w.x, w.y, 12 / scale);
        if (vertex) {
          selectWall({ wallId: vertex.wallId, vertex: vertex.index });
          draggingWall = { wallId: vertex.wallId, index: vertex.index };
          canvas.setPointerCapture(e.pointerId);
          return;
        }
        const segment = hitWallSegment(ctx.wallStates, w.x, w.y, 10 / scale);
        if (segment) {
          selectWall({ wallId: segment.wallId, vertex: null });
          return;
        }
      }
      const p = snapWallPoint(ctx.gridSettings, ctx.wallStates, w.x, w.y);
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
      // Un joueur ne peut déplacer que ses jetons (le serveur re-vérifie).
      const canDrag = bridge.isGM || hit.ownerId === bridge.userId;
      if (canDrag) {
        dragging = { id: hit.id, dx: w.x - hit.x, dy: w.y - hit.y };
        canvas.setPointerCapture(e.pointerId);
      }
      commitTokens(ctx, bridge, ctx.tokenStates, hit.id);
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
    if (draggingWall) {
      const { wallId, index } = draggingWall;
      const w = worldPoint(canvas, ctx.world, e);
      // Sommets de CE mur exclus du snap (sinon le sommet se colle à lui-même).
      const others = ctx.wallStates.map((wall) =>
        wall.id === wallId ? { ...wall, points: wall.points.filter((_, i) => i !== index) } : wall,
      );
      const p = snapWallPoint(ctx.gridSettings, others, w.x, w.y);
      const next = ctx.wallStates.map((wall) =>
        wall.id === wallId
          ? { ...wall, points: wall.points.map((pt, i) => (i === index ? p : pt)) }
          : wall,
      );
      ctx.wallStates = next;
      bridge.setWalls(next);
      redrawWalls(ctx.wallGfx, next, ctx.isGM, ctx.wallSelection);
      scheduleFog(ctx);
      return;
    }
    if (ctx.draft.length > 0 && bridge.toolRef.current === "wall") {
      const w = worldPoint(canvas, ctx.world, e);
      ctx.draftCursor = snapWallPoint(ctx.gridSettings, ctx.wallStates, w.x, w.y);
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
    if (draggingWall) {
      draggingWall = null;
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
