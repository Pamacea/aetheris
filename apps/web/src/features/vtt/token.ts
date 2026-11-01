import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { activeConditions, cssColor } from "./helpers";
import type { TokenState } from "./types";

/**
 * Charge une image dans une Texture Pixi sans passer par le résolveur
 * d'Assets (les URLs blob n'ont pas d'extension). Partagé avec la carte.
 */
export function loadImageTexture(url: string): Promise<Texture> {
  return new Promise<Texture>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(Texture.from(img));
    img.onerror = () => reject(new Error("Image invalide"));
    img.src = url;
  });
}

/** Textures d'images de jetons partagées entre reconstructions (PV, nom…). */
const tokenTextures = new Map<string, Texture>();
/** Chargements en cours par URL : deux jetons identiques n'en lancent qu'un. */
const tokenTextureLoads = new Map<string, Promise<Texture | null>>();
/** URLs encore portées par la scène : une texture chargée hors scène est jetée. */
let activeTokenImages = new Set<string>();

/**
 * Texture d'une image de jeton. Cache par URL (un rebuild ne relance pas le
 * réseau) ; un échec laisse le rendu de repli couleur + initiale.
 */
function resolveTokenTexture(url: string, onReady: (texture: Texture | null) => void): void {
  const cached = tokenTextures.get(url);
  if (cached) {
    onReady(cached);
    return;
  }
  let load = tokenTextureLoads.get(url);
  if (!load) {
    load = loadImageTexture(url).then(
      (texture) => {
        tokenTextureLoads.delete(url);
        // Jeton retiré pendant le chargement : ne pas retenir la texture.
        if (!activeTokenImages.has(url)) {
          texture.destroy(true);
          return null;
        }
        tokenTextures.set(url, texture);
        return texture;
      },
      () => {
        tokenTextureLoads.delete(url);
        return null;
      },
    );
    tokenTextureLoads.set(url, load);
  }
  void load.then(onReady);
}

/** Détruit les textures dont plus aucun jeton ne se sert (à chaque rebuild). */
export function pruneTokenTextures(tokens: readonly TokenState[]): void {
  activeTokenImages = new Set(tokens.flatMap((t) => (t.imageUrl ? [t.imageUrl] : [])));
  for (const [url, texture] of tokenTextures) {
    if (activeTokenImages.has(url)) continue;
    texture.destroy(true);
    tokenTextures.delete(url);
  }
}

/** Construit le conteneur Pixi d'un token (corps + nom + halo de sélection). */
export function buildToken(t: TokenState, selectedToken: string | null): Container {
  const c = new Container();
  c.label = `token:${t.id}`;
  c.position.set(t.x, t.y);

  // Corps seul pivoté (le nom reste droit).
  const body = new Container();
  body.rotation = (t.rot * Math.PI) / 180;
  const colorNum = Number.parseInt(t.color.slice(1), 16);
  body.addChild(
    new Graphics()
      .circle(0, 0, t.size / 2)
      .fill({ color: colorNum })
      .stroke({ width: 2, color: 0x0b0907, alpha: 0.85 }),
  );
  // L'image distante se pose au-dessus de la couleur ; l'initiale reste le
  // repli tant qu'elle n'est pas chargée (404/CORS → rien ne change).
  const imageLayer = new Container();
  body.addChild(imageLayer);
  // Repère de rotation (traits courts aux bords du disque), au-dessus de l'image.
  body.addChild(
    new Graphics()
      .moveTo(t.size / 2 - 7, 0)
      .lineTo(t.size / 2, 0)
      .stroke({ width: 3, color: 0x0b0907, alpha: 0.9 }),
  );
  const initial = new Text({
    text: (t.name.trim().charAt(0) || "?").toUpperCase(),
    style: {
      fontFamily: "Cinzel, serif",
      fontSize: Math.round(t.size * 0.5),
      // Blanche : contrastée sur les teintes TOKEN_COLORS quel que soit le thème.
      fill: 0xffffff,
    },
  });
  initial.anchor.set(0.5);
  body.addChild(initial);
  c.addChild(body);

  // Saisie locale en cours : n'accepte que http(s), comme le schéma persisté.
  const imageUrl = t.imageUrl;
  if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
    resolveTokenTexture(imageUrl, (texture) => {
      // Reconstruction entre-temps : le conteneur détruit ne doit plus rien afficher.
      if (!texture || c.destroyed || texture.width === 0 || texture.height === 0) return;
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      // Couverture : l'image remplit le disque, le masque rogne le débordement.
      const scale = Math.max(t.size / texture.width, t.size / texture.height);
      sprite.width = texture.width * scale;
      sprite.height = texture.height * scale;
      // Rayon -1 : le liseré sombre du corps reste visible autour de l'image.
      const mask = new Graphics().circle(0, 0, t.size / 2 - 1).fill({ color: 0xffffff });
      imageLayer.addChild(sprite, mask);
      sprite.mask = mask;
      initial.visible = false;
    });
  }

  const fontSize = Math.max(10, Math.round(t.size * 0.22));
  const label = new Text({
    text: t.name.trim(),
    style: {
      fontFamily: "Cinzel, serif",
      fontSize,
      fill: cssColor("--aetheris-foreground", 0xe7dcc6, 0.25),
      // Nom borné : deux jetons voisins ne mélangent pas leurs libellés.
      wordWrap: true,
      wordWrapWidth: Math.max(96, t.size * 2.4),
      breakWords: true,
      align: "center",
    },
  });
  label.anchor.set(0.5, 0);
  label.y = t.size / 2 + 6;

  // PV / CA sous le nom : affichés dès qu'ils sont renseignés.
  const stats: string[] = [];
  if (t.hpMax != null) stats.push(`${t.hp ?? 0}/${t.hpMax} PV`);
  if (t.ac != null) stats.push(`CA ${t.ac}`);
  const statLine = stats.length
    ? new Text({
        text: stats.join(" · "),
        style: { fontFamily: "Cinzel, serif", fontSize, fill: 0xe7dcc6, align: "center" },
      })
    : null;
  if (statLine) {
    statLine.anchor.set(0.5, 0);
    // Ancrage sur la hauteur réelle : un nom sur deux lignes ne chevauche pas les PV.
    statLine.y = label.y + label.height + 2;
  }
  // Fond sombre derrière le bloc : lisible sur une carte claire comme sur le fond.
  const blockBottom = statLine ? statLine.y + statLine.height : label.y + label.height;
  const blockW = Math.max(label.width, statLine?.width ?? 0) + 8;
  c.addChild(
    new Graphics()
      .roundRect(-blockW / 2, label.y - 3, blockW, blockBottom - label.y + 6, 4)
      .fill({ color: 0x0b0907, alpha: 0.7 }),
  );
  c.addChild(label);
  if (statLine) c.addChild(statLine);
  const stackY = blockBottom + 6;

  // États actifs : pastilles ambre sous PV/CA, repliées dans la largeur du
  // disque. Couleur fixe (indépendante du jeton) pour rester lisible.
  const conditions = activeConditions(t.conditions);
  if (conditions.length > 0) {
    const chipFont = Math.max(8, Math.round(t.size * 0.12));
    const padX = Math.max(2, Math.round(chipFont * 0.45));
    const gap = 2;
    const chipH = chipFont + 4;
    const chips = conditions.map((condition) => {
      const text = new Text({
        text: condition.short,
        style: { fontFamily: "Cinzel, serif", fontSize: chipFont, fill: 0x140f08 },
      });
      text.anchor.set(0.5);
      return { text, w: Math.ceil(text.width) + padX * 2 };
    });
    const drawRow = (items: typeof chips, top: number) => {
      const total = items.reduce((sum, item) => sum + item.w, 0) + gap * (items.length - 1);
      let cursor = -total / 2;
      for (const item of items) {
        c.addChild(
          new Graphics().roundRect(cursor, top, item.w, chipH, chipH / 2).fill({ color: 0xd9a441 }),
        );
        item.text.position.set(cursor + item.w / 2, top + chipH / 2);
        c.addChild(item.text);
        cursor += item.w + gap;
      }
    };
    let row: typeof chips = [];
    let rowWidth = 0;
    let top = stackY;
    for (const chip of chips) {
      if (row.length > 0 && rowWidth + gap + chip.w > t.size) {
        drawRow(row, top);
        top += chipH + gap;
        row = [];
        rowWidth = 0;
      }
      rowWidth = row.length === 0 ? chip.w : rowWidth + gap + chip.w;
      row.push(chip);
    }
    if (row.length > 0) drawRow(row, top);
  }

  if (t.id === selectedToken) {
    c.addChild(
      new Graphics().circle(0, 0, t.size / 2 + 5).stroke({
        width: 2,
        color: cssColor("--aetheris-accent", 0xe7dcc6, 0.25),
        alpha: 0.95,
      }),
    );
  }
  return c;
}
