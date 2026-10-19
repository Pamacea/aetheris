"use client";

import { useEffect, useRef, useState } from "react";

/** Palette éditoriale partagée : surlignage + couleur du texte. */
const PALETTE = [
  { hex: "#1c1917", name: "Encre" },
  { hex: "#57534e", name: "Pierre" },
  { hex: "#a8a29e", name: "Cendre" },
  { hex: "#f5f1e8", name: "Parchemin" },
  { hex: "#dd5c33", name: "Braise" },
  { hex: "#8a3d10", name: "Terre cuite" },
  { hex: "#b91c1c", name: "Rouge" },
  { hex: "#ea580c", name: "Orange" },
  { hex: "#ca8a04", name: "Ocre" },
  { hex: "#fde68a", name: "Jaune surlignage" },
  { hex: "#15803d", name: "Vert" },
  { hex: "#0f766e", name: "Sarcelle" },
  { hex: "#1d4ed8", name: "Bleu" },
  { hex: "#1e3a8a", name: "Bleu nuit" },
  { hex: "#6d28d9", name: "Violet" },
  { hex: "#9d174d", name: "Cramoisi" },
] as const;

type ColorPickerProps = {
  /** Libellé FR repris dans l'aria-label de chaque pastille. */
  label: string;
  /** Couleur courante, "" si aucune. */
  value: string;
  /** Teinte affichée sur le déclencheur quand `value` est vide. */
  fallback: string;
  /** État actif du déclencheur (bordure accent). */
  active?: boolean;
  /** Tooltip + aria-label du déclencheur. */
  title: string;
  onPick: (hex: string) => void;
};

/**
 * Sélecteur de couleur maison (DA taillée : zéro border-radius) : un
 * déclencheur pastille ouvre une grille de 16 teintes éditoriales au-dessus
 * de la barre d'outils (sticky bottom), plus un `input[type=color]` natif
 * déguisé en pastille pour un choix libre. Fermeture : clic extérieur, Échap,
 * ou choix d'une teinte.
 */
export function ColorPicker({
  label,
  value,
  fallback,
  active = false,
  title,
  onPick,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (hex: string) => {
    onPick(hex);
    setOpen(false);
  };

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-center px-1.5 py-1 transition ${
          active ? "border border-accent bg-accent/15" : "border border-transparent"
        }`}
      >
        <span
          className="block h-3.5 w-5 border border-border"
          style={{ backgroundColor: value || fallback }}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="group"
          aria-label={`${label} — palette de couleurs`}
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 border border-border bg-background p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <div className="grid grid-cols-4 gap-1">
            {PALETTE.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                aria-label={`${label} : ${c.name}`}
                aria-pressed={value.toLowerCase() === c.hex}
                onClick={() => pick(c.hex)}
                className="h-5 w-5 border border-border transition hover:border-accent"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <span className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-1.5">
            <input
              type="color"
              value={value || fallback}
              onChange={(e) => pick(e.target.value)}
              title="Couleur personnalisée"
              aria-label={`${label} : couleur personnalisée`}
              className="editor-color-native h-5 w-5"
            />
            <span className="text-[0.6rem] tracking-widest text-muted uppercase">Personnalisé</span>
          </span>
        </div>
      )}
    </span>
  );
}
