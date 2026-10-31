import { describe, expect, it } from "vitest";
import { resolveBacklinks } from "./backlinks";
import type { WikiTemplateMeta } from "./types";

const entree = (id: string, title: string, contentHtml: string | null, extra = {}) => ({
  id,
  title,
  contentHtml,
  type: "note",
  data: {},
  ...extra,
});

/** Lien wiki tel qu'il est persisté : `<a data-wiki-link="Titre">`. */
const lien = (titre: string) => `<p><a data-wiki-link="${titre}">${titre}</a></p>`;
/** Lien récent : id stable + ancien titre (cible renommée). */
const lienId = (titre: string, id: string) =>
  `<p><a data-wiki-link="${titre}" data-wiki-link-id="${id}">${titre}</a></p>`;

const templateTag: WikiTemplateMeta = {
  id: "tpl-1",
  name: "PNJ",
  category: null,
  schema: { fields: [{ id: "lie", label: "Lié à", kind: "tag" }] },
};

describe("resolveBacklinks", () => {
  const active = { id: "a", title: "Aldric" };

  it("retient les liens [[…]] insensibles à la casse", () => {
    const res = resolveBacklinks({
      active,
      entries: [entree("b", "B", lien("aldric")), entree("c", "C", "<p>Non</p>")],
      templates: [],
      isGM: true,
    });
    expect(res).toEqual([{ id: "b", title: "B" }]);
  });

  it("résout par id même si le titre affiché a changé (renommage)", () => {
    const res = resolveBacklinks({
      active,
      entries: [entree("b", "B", lienId("Aldric le Sage", "a"))],
      templates: [],
      isGM: true,
    });
    expect(res).toEqual([{ id: "b", title: "B" }]);
  });

  it("exclut l'auto-référence et déduplique liens HTML + champ tag", () => {
    const res = resolveBacklinks({
      active,
      entries: [
        entree("a", "A", lien("Aldric")),
        entree("b", "B", lien("Aldric"), { type: "tpl-1", data: { lie: "a" } }),
        entree("c", "C", null, { type: "tpl-1", data: { lie: "a" } }),
      ],
      templates: [templateTag],
      isGM: true,
    });
    // b vu deux fois (HTML + tag) : une seule entrée ; a = auto-référence.
    expect(res).toEqual([
      { id: "b", title: "B" },
      { id: "c", title: "C" },
    ]);
  });

  it("n'expose pas les liens contenus dans un secret MJ pour un joueur", () => {
    const gmOnly = entree("s", "S", `<gm-secret>${lien("Aldric")}</gm-secret>`);
    expect(resolveBacklinks({ active, entries: [gmOnly], templates: [], isGM: true })).toEqual([
      { id: "s", title: "S" },
    ]);
    expect(resolveBacklinks({ active, entries: [gmOnly], templates: [], isGM: false })).toEqual([]);
  });

  it("retourne une liste vide sans entrée active", () => {
    expect(resolveBacklinks({ active: null, entries: [], templates: [], isGM: true })).toEqual([]);
  });
});
