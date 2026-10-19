import { Container, Graphics, Text } from "pixi.js";
import { cssColor, noteTitle } from "./vtt-app-helpers";
import type { TokenState } from "./vtt-app-types";

/** Construit le conteneur Pixi d'un token (corps + PV + nom + halo de sélection). */
export function buildToken(t: TokenState, selectedToken: string | null): Container {
  const c = new Container();
  c.label = `token:${t.id}`;
  c.position.set(t.x, t.y);

  // Corps seul pivoté (la barre PV et le nom restent droites).
  const body = new Container();
  body.rotation = (t.rot * Math.PI) / 180;
  const colorNum = Number.parseInt(t.color.slice(1), 16);
  const isNote = t.noteId != null;
  // Rectangle « parchemin » : même ordre de grandeur que le disque pour
  // ne pas bouleverser la grille.
  const rw = t.size;
  const rh = Math.round(t.size * 0.8);
  const rr = Math.min(8, Math.round(t.size * 0.1));

  if (isNote) {
    const fold = Math.min(14, Math.round(t.size * 0.2));
    const pad = 10;
    body.addChild(
      // Parchemin clair : lisible sur la table sombre comme sur un thème
      // clair ; encre sombre fixe, contraste indépendant du thème.
      new Graphics()
        .roundRect(-rw / 2, -rh / 2, rw, rh, rr)
        .fill({ color: 0xf3e8cd })
        .stroke({ width: 2, color: 0x6b5636, alpha: 0.9 }),
      // Coin replié en bas à droite (page cornée).
      new Graphics()
        .poly([rw / 2 - fold, rh / 2, rw / 2, rh / 2 - fold, rw / 2, rh / 2])
        .fill({ color: 0xdbc7a1 })
        .stroke({ width: 1, color: 0x6b5636, alpha: 0.7 }),
    );
    const fontSize = Math.max(9, Math.round(t.size * 0.16));
    const title = new Text({
      text: noteTitle(t.name, fontSize, rw - pad, 3),
      style: {
        fontFamily: "Cinzel, serif",
        fontSize,
        fill: 0x2b2118,
        align: "center",
        lineHeight: fontSize * 1.25,
        wordWrap: true,
        wordWrapWidth: rw - pad,
        breakWords: true,
      },
    });
    title.anchor.set(0.5);
    body.addChild(title);
    c.addChild(body);
  } else {
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
  }

  // Barre PV (au-dessus) : verte > ambrée > rouge — une note n'a pas de PV.
  if (!isNote && t.hpMax !== null && t.hpMax > 0) {
    const barW = t.size;
    const top = -t.size / 2 - 12;
    const ratio = Math.max(0, Math.min(1, (t.hp ?? 0) / t.hpMax));
    c.addChild(
      new Graphics().rect(-barW / 2, top, barW, 6).fill(0x0b0907),
      new Graphics()
        .rect(-barW / 2, top, barW * ratio, 6)
        .fill(
          ratio > 0.5
            ? cssColor("--aetheris-accent", 0x5aa04f, 0.5)
            : ratio > 0.25
              ? 0xc08a1b
              : cssColor("--aetheris-destructive", 0xc03a1b, 0.5),
        ),
    );
  }

  // Nom sous le corps — inutile pour une note : son titre est déjà dedans.
  if (!isNote) {
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
  }

  if (t.id === selectedToken) {
    const halo = new Graphics();
    const stroke = {
      width: 2,
      color: cssColor("--aetheris-accent", 0xe7dcc6, 0.25),
      alpha: 0.95,
    };
    if (isNote) halo.roundRect(-rw / 2 - 5, -rh / 2 - 5, rw + 10, rh + 10, rr + 3).stroke(stroke);
    else halo.circle(0, 0, t.size / 2 + 5).stroke(stroke);
    c.addChild(halo);
  }
  return c;
}
