import { Application, Container, Graphics } from "pixi.js";
import { buildVttApi } from "./vtt-app-api";
import { area } from "./vtt-app-draw";
import { attachPointers } from "./vtt-app-pointers";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, type VttBridge, type VttSceneCtx } from "./vtt-app-types";

/**
 * Monte l'app PixiJS dans `host` et renvoie le nettoyage de l'effet React.
 * L'état mutable vit dans `ctx` (créé ici) ; React ne parle qu'à travers
 * `bridge` (setters + refs stables, capturés une seule fois).
 */
export function createVttScene(host: HTMLDivElement, bridge: VttBridge): () => void {
  const instance = new Application();

  // Calques de scène, portés par la caméra (world).
  const world = new Container();
  world.label = "world";
  const fond = new Container();
  fond.label = "fond";
  const grille = new Container();
  grille.label = "grille";
  const tokensLayer = new Container();
  tokensLayer.label = "tokens";
  const lumiere = new Container();
  lumiere.label = "lumiere";
  const murs = new Container();
  murs.label = "murs";
  const brouillard = new Container();
  brouillard.label = "brouillard";
  world.addChild(fond, grille, tokensLayer, lumiere, murs, brouillard);

  const overlay = new Container();
  overlay.label = "overlay";

  const gridGfx = new Graphics();
  grille.addChild(gridGfx);
  const wallGfx = new Graphics();
  const draftGfx = new Graphics();
  murs.addChild(wallGfx, draftGfx);
  const fogGfx = new Graphics();
  brouillard.addChild(fogGfx);

  const seed = bridge.settingsRef.current;
  const ctx: VttSceneCtx = {
    instance,
    world,
    fond,
    tokensLayer,
    gridGfx,
    wallGfx,
    draftGfx,
    fogGfx,
    mapSprite: null,
    mapToken: 0,
    gridSettings: seed.grid,
    // Seed vide : le replay setWalls(settingsRef…) dessine sinon saute
    // sur la garde d'égalité de ref (même tableau qu'au montage).
    tokenStates: [],
    selectedToken: null,
    wallStates: [],
    fogEnabled: seed.fogOn,
    sightCells: seed.sightCells,
    draft: [],
    draftCursor: null,
    fogPending: false,
    disposed: false,
  };

  let app: Application | null = null;
  let onWheel: ((e: WheelEvent) => void) | null = null;

  (async () => {
    await instance.init({
      resizeTo: host,
      background: 0x0b0907, // le fond de table reste sombre par choix
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    if (ctx.disposed) {
      instance.destroy(true, { children: true });
      return;
    }
    app = instance;
    host.appendChild(instance.canvas);
    instance.canvas.style.display = "block";
    instance.canvas.style.touchAction = "none";
    instance.stage.addChild(world, overlay);

    // Réglages relus après l'init asynchrone (l'effet de réglages a pu tourner entre-temps).
    const s = bridge.settingsRef.current;
    ctx.gridSettings = s.grid;
    ctx.fogEnabled = s.fogOn;
    ctx.sightCells = s.sightCells;

    const fitView = (w: number, h: number) => {
      const sw = instance.screen.width;
      const sh = instance.screen.height;
      const z = Math.min(sw / w, sh / h) * 0.92;
      world.scale.set(z);
      world.x = (sw - w * z) / 2;
      world.y = (sh - h * z) / 2;
      bridge.setZoom(z);
    };

    const api = buildVttApi(ctx, bridge, fitView);
    bridge.apiRef.current = api;
    api.setGrid(s.grid);
    api.setWalls(s.walls);
    api.setFog(s.fogOn, s.sightCells);
    api.setTokens(s.tokens, s.selectedId);
    if (s.mapUrl) void api.setMap(s.mapUrl);
    {
      const a = area(ctx.mapSprite, ctx.gridSettings);
      fitView(a.w, a.h);
    }

    // Zoom centré sur le curseur.
    onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = instance.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, world.scale.x * factor));
      const wx = (px - world.x) / world.scale.x;
      const wy = (py - world.y) / world.scale.y;
      world.scale.set(next);
      world.x = px - wx * next;
      world.y = py - wy * next;
      bridge.setZoom(next);
    };
    instance.canvas.addEventListener("wheel", onWheel, { passive: false });

    attachPointers(ctx, bridge);
  })();

  return () => {
    ctx.disposed = true;
    bridge.apiRef.current = null;
    if (onWheel && app) app.canvas.removeEventListener("wheel", onWheel);
    app?.destroy(true, { children: true });
  };
}
