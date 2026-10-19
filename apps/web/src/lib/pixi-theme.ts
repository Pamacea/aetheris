/**
 * Couleurs Pixi lues depuis les vars de thème (format #rgb/#rrggbb/rgba()/rgb()).
 * `minLum` : seuil de luminance — un élément posé sur la table (fond toujours
 * #0b0907) doit rester lisible sous un thème clair, d'où le repli sur `fallback`.
 */
export function resolveColor(raw: string, fallback: number, minLum = 0): number {
  const value = raw.trim();
  let c: number | null = null;
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      c = Number.parseInt(hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2], 16);
    } else if (hex.length === 6 || hex.length === 8) {
      c = Number.parseInt(hex.slice(0, 6), 16);
    }
  } else {
    const rgb = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(value);
    if (rgb) c = (Math.round(+rgb[1]) << 16) | (Math.round(+rgb[2]) << 8) | Math.round(+rgb[3]);
  }
  if (c === null || Number.isNaN(c)) return fallback;
  const lum = (((c >> 16) & 255) * 0.299 + ((c >> 8) & 255) * 0.587 + (c & 255) * 0.114) / 255;
  return lum < minLum ? fallback : c;
}
