import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { cssColor } from "./helpers";
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
    text: t.name,
    style: {
      fontFamily: "Cinzel, serif",
      fontSize,
      fill: cssColor("--aetheris-foreground", 0xe7dcc6, 0.25),
    },
  });
  label.anchor.set(0.5, 0);
  label.y = t.size / 2 + 6;
  c.addChild(label);

  // PV / CA sous le nom : affichés dès qu'ils sont renseignés.
  const stats: string[] = [];
  if (t.hpMax != null) stats.push(`${t.hp ?? 0}/${t.hpMax} PV`);
  if (t.ac != null) stats.push(`CA ${t.ac}`);
  if (stats.length > 0) {
    const statLine = new Text({
      text: stats.join(" · "),
      style: { fontFamily: "Cinzel, serif", fontSize, fill: 0xe7dcc6 },
    });
    statLine.anchor.set(0.5, 0);
    statLine.y = label.y + fontSize + 2;
    c.addChild(statLine);
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
