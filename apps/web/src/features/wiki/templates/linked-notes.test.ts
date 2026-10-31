import { describe, expect, it } from "vitest";
import type { ListColumn } from "@aetheris/shared";
import {
  cardColumnTemplate,
  cardWidth,
  collectLinkedNoteIds,
  linkedNote,
  linkedNoteVisuals,
  noteVisuals,
  numberColumn,
  summarizeLinkedNote,
  valueColumns,
} from "./linked-notes";
import type { WikiTemplateMeta } from "../types";

const template = (schema: unknown): WikiTemplateMeta => ({
  id: "tpl-sort",
  name: "Sort",
  category: null,
  schema,
});

const schema = {
  fields: [
    {
      id: "sorts",
      label: "Sorts",
      kind: "ability",
      columns: [
        { id: "lien", label: "Fiche", type: "tag" },
        { id: "cout", label: "Coût", type: "number" },
      ],
    },
    {
      id: "objets",
      label: "Objets",
      kind: "inventory",
      columns: [{ id: "lien", label: "Fiche", type: "tag" }],
    },
    {
      id: "notes",
      label: "Notes",
      kind: "list",
      columns: [{ id: "lien", label: "Fiche", type: "tag" }],
    },
  ],
};

describe("collectLinkedNoteIds", () => {
  it("collecte les ids des colonnes tag, dédupliqués et dans l'ordre", () => {
    const res = collectLinkedNoteIds(schema, {
      sorts: [{ lien: "a" }, { lien: "b" }, { lien: "a" }, { lien: "" }],
      objets: [{ lien: "c" }],
      notes: [{ lien: 42 }, { lien: "b" }],
    });
    expect([...res]).toEqual(["a", "b", "c"]);
  });

  it("ignore les schémas invalides et les données non tabulaires", () => {
    expect([...collectLinkedNoteIds({ fields: "nope" }, { sorts: [{ lien: "a" }] })]).toEqual([]);
    expect([...collectLinkedNoteIds(schema, { sorts: "nope" })]).toEqual([]);
  });
});

describe("summarizeLinkedNote", () => {
  it("résume les champs scalaires non vides dans l'ordre du modèle", () => {
    const tpl = template({
      fields: [
        { id: "ecole", label: "École", kind: "text" },
        { id: "cout", label: "Coût", kind: "number" },
        { id: "type", label: "Type", kind: "select", options: [{ value: "feu", label: "Feu" }] },
        { id: "actif", label: "Actif", kind: "toggle" },
        { id: "vide", label: "Vide", kind: "text" },
      ],
    });
    const res = summarizeLinkedNote({ title: "Boule de feu", type: "tpl-sort" }, tpl, {
      ecole: "Évocation",
      cout: 3,
      type: "feu",
      actif: true,
      vide: "   ",
    });
    expect(res).toEqual({
      title: "Boule de feu",
      templateName: "Sort",
      summary: [
        ["École", "Évocation"],
        ["Coût", "3"],
        ["Type", "Feu"],
        ["Actif", "oui"],
      ],
    });
  });

  it("tronque les valeurs à 40 caractères", () => {
    const long = "x".repeat(60);
    const res = summarizeLinkedNote(
      { title: "Long", type: "tpl-sort" },
      template({ fields: [{ id: "texte", label: "Texte", kind: "text" }] }),
      { texte: long },
    );
    expect(res.summary[0]?.[1]).toHaveLength(40);
  });

  it("limite à 6 paires", () => {
    const fields = Array.from({ length: 8 }, (_, i) => ({
      id: `t${i}`,
      label: `T${i}`,
      kind: "text",
    }));
    const data = Object.fromEntries(fields.map((f) => [f.id, "valeur"]));
    const res = summarizeLinkedNote(
      { title: "Beaucoup", type: "tpl-sort" },
      template({ fields }),
      data,
    );
    expect(res.summary).toHaveLength(6);
  });

  it("renvoie un résumé vide pour un schéma invalide", () => {
    const res = summarizeLinkedNote({ title: "Cassé", type: "tpl-sort" }, template({}), { a: 1 });
    expect(res.summary).toEqual([]);
  });
});

describe("linkedNoteVisuals", () => {
  it("prend la première image non vide et le premier nombre poids/weight", () => {
    const tpl = template({
      fields: [
        { id: "illustration", label: "Illustration", kind: "image" },
        { id: "vide", label: "Vide", kind: "image" },
        { id: "masse", label: "Poids (kg)", kind: "number" },
      ],
    });
    expect(linkedNoteVisuals(tpl, { illustration: " /img/epee.png ", masse: 2.5 })).toEqual({
      icon: "/img/epee.png",
      weight: 2.5,
    });
  });

  it("accepte un id « weight » et ignore les valeurs non numériques", () => {
    const tpl = template({
      fields: [{ id: "weight", label: "Charge", kind: "number" }],
    });
    expect(linkedNoteVisuals(tpl, { weight: 3 })).toEqual({ icon: null, weight: 3 });
    expect(linkedNoteVisuals(tpl, { weight: "3" })).toEqual({ icon: null, weight: null });
  });

  it("renvoie null/null sans schéma valide", () => {
    expect(linkedNoteVisuals(null, { x: 1 })).toEqual({ icon: null, weight: null });
    expect(linkedNoteVisuals(template({}), { x: 1 })).toEqual({ icon: null, weight: null });
  });
});

describe("linkedNote", () => {
  it("combine le résumé et les données de la fiche", () => {
    const tpl = template({
      fields: [
        { id: "image", label: "Image", kind: "image" },
        { id: "poids", label: "Poids", kind: "number" },
        { id: "ecole", label: "École", kind: "text" },
      ],
    });
    expect(
      linkedNote({ title: "Épée", type: "tpl-sort" }, tpl, {
        image: "/epee.png",
        poids: 4,
        ecole: "Guerre",
      }),
    ).toEqual({
      title: "Épée",
      templateName: "Sort",
      summary: [
        ["Poids", "4"],
        ["École", "Guerre"],
      ],
      icon: "/epee.png",
      weight: 4,
    });
  });
});

describe("colonnes de carte", () => {
  const columns: ListColumn[] = [
    { id: "lien", label: "Fiche", type: "tag" },
    { id: "nom", label: "Nom", type: "text" },
    { id: "quantite", label: "Quantité", type: "number" },
    { id: "equipe", label: "Équipé", type: "toggle" },
  ];

  it("numberColumn ne retient qu'une colonne numérique du bon id", () => {
    expect(numberColumn(columns, "quantite")?.label).toBe("Quantité");
    expect(
      numberColumn([{ id: "quantite", label: "Quantité", type: "text" }], "quantite"),
    ).toBeNull();
    expect(numberColumn(columns, "poids")).toBeNull();
  });

  it("valueColumns retire la colonne de lien", () => {
    expect(valueColumns(columns, "lien").map((c) => c.id)).toEqual(["nom", "quantite", "equipe"]);
  });

  it("cardColumnTemplate aligne les pistes selon le type", () => {
    expect(cardColumnTemplate(valueColumns(columns, "lien"))).toBe("minmax(0,1fr) 4rem 2rem");
  });

  it("cardWidth partage une largeur fixe entre en-tête et cartes", () => {
    // texte 96 + nombre 64 + toggle 32 + deux gouttières de 8
    expect(cardWidth(valueColumns(columns, "lien"))).toBe(208);
    expect(cardWidth([])).toBe(0);
  });
});

describe("noteVisuals", () => {
  const notes = [
    { id: "a", icon: "/notes-a.png", weight: 2 },
    { id: "b", icon: null, weight: null },
    { id: "c" },
  ];

  it("priorité à la fiche liée", () => {
    expect(noteVisuals("a", { a: { icon: "/liee-a.png", weight: 5 } }, notes)).toEqual({
      icon: "/liee-a.png",
      weight: 5,
    });
  });

  it("repli sur les métadonnées de la liste", () => {
    expect(noteVisuals("a", {}, notes)).toEqual({ icon: "/notes-a.png", weight: 2 });
  });

  it("repli champ par champ quand la fiche liée est partielle", () => {
    expect(noteVisuals("a", { a: { icon: null, weight: 5 } }, notes)).toEqual({
      icon: "/notes-a.png",
      weight: 5,
    });
  });

  it("null/null pour une note inconnue ou sans visuel", () => {
    expect(noteVisuals("inconnue", {}, notes)).toEqual({ icon: null, weight: null });
    expect(noteVisuals("b", {}, notes)).toEqual({ icon: null, weight: null });
    expect(noteVisuals("c", {}, notes)).toEqual({ icon: null, weight: null });
  });
});
