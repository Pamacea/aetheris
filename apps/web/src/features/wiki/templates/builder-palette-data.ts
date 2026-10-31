import { fold } from "@/lib/text";
import type { PaletteItem } from "./builder-field-factory";
import { makeField } from "./builder-field-factory";
import { LISTES_GROUP } from "./builder-palette-lists";

export type PaletteGroup = { title: string; items: PaletteItem[] };

const PALETTE_GROUPS: PaletteGroup[] = [
  {
    title: "Texte",
    items: [
      {
        key: "text",
        label: "Texte court",
        hint: "Nom, titre, race…",
        make: (id) => makeField("text", id, "Texte court"),
      },
      {
        key: "textarea",
        label: "Texte long",
        hint: "Description, histoire…",
        make: (id) => makeField("textarea", id, "Texte long"),
      },
    ],
  },
  {
    title: "Nombres",
    items: [
      {
        key: "int",
        label: "Entier",
        hint: "Niveau, âge, quantité…",
        make: (id) => ({ ...makeField("number", id, "Entier"), decimals: 0 }),
      },
      {
        key: "float",
        label: "Décimal",
        hint: "Taille, poids, mod…",
        make: (id) => ({ ...makeField("number", id, "Décimal"), decimals: 2 }),
      },
      {
        key: "counter",
        label: "Compteur",
        hint: "PV, charges (±)…",
        make: (id) => makeField("counter", id, "Compteur"),
      },
    ],
  },
  {
    title: "Choix",
    items: [
      {
        key: "select",
        label: "Liste",
        hint: "Options avec couleurs",
        make: (id) => makeField("select", id, "Liste"),
      },
      {
        key: "multiselect",
        label: "Choix multiples",
        hint: "Tags de sorts, caractéristiques…",
        make: (id) => makeField("multiSelect", id, "Choix multiples"),
      },
      {
        key: "toggle",
        label: "Interrupteur",
        hint: "Oui / non",
        make: (id) => makeField("toggle", id, "Interrupteur"),
      },
      {
        key: "tag",
        label: "Lien wiki",
        hint: "Relie une autre note",
        make: (id) => makeField("tag", id, "Lien wiki"),
      },
    ],
  },
  LISTES_GROUP,
  {
    title: "Média",
    items: [
      {
        key: "image",
        label: "Image",
        hint: "Portrait ou carte (URL)",
        make: (id) => makeField("image", id, "Image"),
      },
    ],
  },
  {
    title: "Calcul",
    items: [
      {
        key: "formula",
        label: "Formule",
        hint: "Calcul auto (force+mod)",
        make: (id) => makeField("formula", id, "Formule"),
      },
    ],
  },
  {
    title: "Code",
    items: [
      {
        key: "js",
        label: "Code JS",
        hint: "Valeur calculée (sandbox)",
        make: (id) => makeField("js", id, "Code JS"),
      },
    ],
  },
];

const PALETTE_ITEMS = PALETTE_GROUPS.flatMap((g) => g.items);

/** Filtre la palette sur le libellé, l'aide ou la clé (casse et accents ignorés). */
export function filterPaletteGroups(groups: PaletteGroup[], query: string): PaletteGroup[] {
  const q = fold(query.trim());
  if (!q) return groups;
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => fold(`${item.label} ${item.hint} ${item.key}`).includes(q)),
    }))
    .filter((g) => g.items.length > 0);
}

export { PALETTE_GROUPS, PALETTE_ITEMS };
