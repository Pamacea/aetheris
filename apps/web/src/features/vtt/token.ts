import { Container, Graphics, Text } from "pixi.js";
import { cssColor } from "./helpers";
import type { TokenState } from "./types";

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
  // Repère de rotation (traits courts aux bords du disque).
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

  const label = new Text({
    text: t.name,
    style: {
      fontFamily: "Cinzel, serif",
      fontSize: Math.max(10, Math.round(t.size * 0.22)),
      fill: cssColor("--aetheris-foreground", 0xe7dcc6, 0.25),
    },
  });
  label.anchor.set(0.5, 0);
  label.y = t.size / 2 + 6;
  c.addChild(label);

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
