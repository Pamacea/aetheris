import type { PaletteItem } from "./builder-field-factory";
import { makeField } from "./builder-field-factory";

// Groupe « Listes » isolé : ses presets de colonnes font dépasser le reste de
// la palette de 150 lignes.
export const LISTES_GROUP: { title: string; items: PaletteItem[] } = {
  title: "Listes",
  items: [
    {
      key: "list",
      label: "Liste",
      hint: "Colonnes + lignes à définir",
      make: (id) => makeField("list", id, "Liste"),
    },
    {
      key: "list-inventaire",
      label: "Inventaire",
      hint: "Fiches liées, quantité, poids, objets équipés…",
      make: (id) => makeField("inventory", id, "Inventaire"),
    },
    {
      key: "list-sorts",
      label: "Sorts",
      hint: "Fiches liées, coût, recharge, dégâts, passif…",
      make: (id) => makeField("ability", id, "Sorts"),
    },
    {
      key: "list-competences",
      label: "Compétences",
      hint: "Fiches liées, coût, modificateur passif…",
      make: (id) => makeField("ability", id, "Compétences"),
    },
  ],
};
