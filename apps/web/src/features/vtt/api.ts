import { Sprite, Texture } from "pixi.js";
import { applyTokens } from "./apply";
import { area, redrawDraft, redrawGrid, redrawWalls } from "./draw";
import { scheduleFog } from "./fog";
import { newId } from "./helpers";
import { type VttApi, type VttBridge, type VttSceneCtx, type WallLine } from "./types";

/**
 * API exposée à React (`apiRef`) : chaque appel répercute un setter d'état
 * sur les Graphics Pixi. `fitView` recentre la caméra (définie par la scène).
 */
export function buildVttApi(
  ctx: VttSceneCtx,
  bridge: VttBridge,
  fitView: (w: number, h: number) => void,
): VttApi {
  const gridArea = () => area(ctx.mapSprite, ctx.gridSettings);

  return {
    setGrid(g) {
      ctx.gridSettings = g;
      redrawGrid(ctx.gridGfx, g, gridArea());
      scheduleFog(ctx);
    },
    async setMap(url) {
      const token = ++ctx.mapToken;
      if (ctx.mapSprite) {
        ctx.fond.removeChild(ctx.mapSprite);
        ctx.mapSprite.destroy();
        ctx.mapSprite = null;
      }
      redrawGrid(ctx.gridGfx, ctx.gridSettings, gridArea());
      if (!url) {
        const a = gridArea();
        fitView(a.w, a.h);
        scheduleFog(ctx);
        return;
      }
      try {
        // Les URLs blob n'ont pas d'extension : on contourne le
        // résolveur d'Assets en passant par un HTMLImageElement.
        const texture = await new Promise<Texture>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(Texture.from(img));
          img.onerror = () => reject(new Error("Image invalide"));
          img.src = url;
        });
        if (token !== ctx.mapToken || ctx.disposed) {
          texture.destroy(true);
          return;
        }
        const sprite = new Sprite(texture);
        ctx.fond.addChild(sprite);
        ctx.mapSprite = sprite;
        redrawGrid(ctx.gridGfx, ctx.gridSettings, gridArea());
        fitView(texture.width, texture.height);
        scheduleFog(ctx);
      } catch {
        // URL d'image invalide : on garde la scène sans carte.
      }
    },
    setTokens(list, sel) {
      if (list === ctx.tokenStates && sel === ctx.selectedToken) return;
      applyTokens(ctx, list, sel);
    },
    setWalls(list) {
      if (list === ctx.wallStates) return;
      ctx.wallStates = list;
      // Sélection orpheline (mur supprimé) : le rendu n'a plus rien à surligner.
      if (ctx.wallSelection && !list.some((w) => w.id === ctx.wallSelection?.wallId)) {
        ctx.wallSelection = null;
      }
      redrawWalls(ctx.wallGfx, list, ctx.isGM, ctx.wallSelection);
      scheduleFog(ctx);
    },
    setWallSelection(sel) {
      ctx.wallSelection = sel;
      redrawWalls(ctx.wallGfx, ctx.wallStates, ctx.isGM, sel);
    },
    setFog(on, cells) {
      ctx.fogEnabled = on;
      ctx.sightCells = cells;
      scheduleFog(ctx);
    },
    finishDraft(type) {
      if (ctx.draft.length >= 2) {
        const wall: WallLine = { id: newId(), type, points: [...ctx.draft] };
        const next = [...ctx.wallStates, wall];
        ctx.wallStates = next;
        bridge.setWalls(next);
        redrawWalls(ctx.wallGfx, next, ctx.isGM, ctx.wallSelection);
        scheduleFog(ctx);
      }
      ctx.draft = [];
      ctx.draftCursor = null;
      bridge.setDraftCount(0);
      redrawDraft(ctx.draftGfx, ctx.draft, ctx.draftCursor);
    },
    cancelDraft() {
      ctx.draft = [];
      ctx.draftCursor = null;
      bridge.setDraftCount(0);
      redrawDraft(ctx.draftGfx, ctx.draft, ctx.draftCursor);
    },
  };
}
