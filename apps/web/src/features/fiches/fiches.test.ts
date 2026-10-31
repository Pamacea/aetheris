import { describe, expect, it } from "vitest";
import { selectFiches } from "./fiches";
import type { WikiTemplateMeta } from "@/features/wiki/types";

const templates: WikiTemplateMeta[] = [
  { id: "tpl-1", name: "Héros", category: null, schema: { fields: [] } },
  { id: "tpl-2", name: "Bestiaire", category: "Bestiaire", schema: { fields: [] } },
];

describe("selectFiches", () => {
  it("ne garde que les entités dont le type est un template de la campagne", () => {
    const res = selectFiches(
      [
        { id: "e1", title: "Astrid", type: "tpl-1", data: {} },
        { id: "e2", title: "Note libre", type: "note", data: {} },
        { id: "e3", title: "Loup", type: "tpl-2", data: {} },
        { id: "e4", title: "Orpheline", type: "tpl-supprimé", data: {} },
      ],
      templates,
    );
    expect(res.map((f) => [f.id, f.title, f.templateName, f.category])).toEqual([
      ["e1", "Astrid", "Héros", null],
      ["e3", "Loup", "Bestiaire", "Bestiaire"],
    ]);
  });

  it("transmet le schéma du template et vide la clé blocks des données", () => {
    const res = selectFiches(
      [{ id: "e1", title: "Astrid", type: "tpl-1", data: { pv: 12, blocks: { x: 1 } } }],
      templates,
    );
    expect(res[0]?.schemaRaw).toBe(templates[0]?.schema);
    expect(res[0]?.data).toEqual({ pv: 12 });
  });

  it("transmet les joueurs assignés (liste vide si non assignée)", () => {
    const res = selectFiches(
      [
        {
          id: "e1",
          title: "Astrid",
          type: "tpl-1",
          data: {},
          assignees: [{ userId: "u1" }, { userId: "u2" }],
        },
        { id: "e2", title: "Loup", type: "tpl-2", data: {} },
      ],
      templates,
    );
    expect(res.map((f) => f.assigneeIds)).toEqual([["u1", "u2"], []]);
  });

  it("retourne une liste vide sans template", () => {
    expect(selectFiches([{ id: "e1", title: "Astrid", type: "tpl-1", data: {} }], [])).toEqual([]);
  });
});
