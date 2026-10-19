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
      hint: "Nom, quantité, poids…",
      make: (id) => ({
        ...makeField("list", id, "Inventaire"),
        columns: [
          { id: "nom", label: "Nom", type: "text" },
          { id: "quantite", label: "Quantité", type: "number" },
          { id: "poids", label: "Poids", type: "number" },
        ],
      }),
    },
    {
      key: "list-sorts",
      label: "Sorts",
      hint: "Nom, niveau, école…",
      make: (id) => ({
        ...makeField("list", id, "Sorts"),
        columns: [
          { id: "nom", label: "Nom", type: "text" },
          { id: "niveau", label: "Niveau", type: "number" },
          { id: "ecole", label: "École", type: "text" },
        ],
      }),
    },
    {
      key: "list-competences",
      label: "Compétences",
      hint: "Nom, valeur, maîtrise…",
      make: (id) => ({
        ...makeField("list", id, "Compétences"),
        columns: [
          { id: "nom", label: "Nom", type: "text" },
          { id: "valeur", label: "Valeur", type: "number" },
          { id: "maitrise", label: "Maîtrise", type: "text" },
        ],
      }),
    },
  ],
};
