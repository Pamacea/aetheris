import { describe, expect, it } from "vitest";
import type { TemplateField } from "@aetheris/shared";
import type { WikiTemplateMeta } from "../types";
import type { BuilderState } from "./builder-state";
// Alias local : ces ops sont des fermetures pures, pas un hook React,
// donc appelées hors composant (la règle rules-of-hooks verrait un « use »).
import { useFieldOps as creerOps } from "./builder-ops";

type Drag = { key: string } | null;

const champ = (id: string): TemplateField => ({ id, label: id, kind: "text" });
const ids = (l: TemplateField[]) => l.map((f) => f.id);

/** État de builder simulé : un seul template, rendu synchrone (pas de React). */
function monde(initial: TemplateField[]) {
  let items: WikiTemplateMeta[] = [
    { id: "t1", name: "Fiche", category: null, schema: { fields: initial } },
  ];
  let status = "idle";
  let openCfg = new Set<string>();
  let drag: Drag = null;

  const champsDe = () => (items[0].schema as { fields: TemplateField[] }).fields;

  const etat = () => ({
    fields: champsDe(),
    selected: items[0],
    setItems: (updater: (prev: WikiTemplateMeta[]) => WikiTemplateMeta[]) => {
      items = updater(items);
    },
    setStatus: (s: string) => {
      status = s;
    },
    setNotice: () => {},
    listRef: {
      current: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800 }) },
    },
    drag,
    setDrag: (v: Drag) => {
      drag = v;
    },
    setOpenCfg: (v: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      openCfg = typeof v === "function" ? v(openCfg) : v;
    },
  });

  return {
    /** Nouvelles ops : en React, chaque mutation re-rend et recrée les closures. */
    ops: () => creerOps(etat() as unknown as BuilderState),
    champs: champsDe,
    ouverts: () => openCfg,
    statut: () => status,
    poserDrag: (d: Drag) => {
      drag = d;
    },
  };
}

const evt = { preventDefault: () => {}, clientX: 700, clientY: 100 } as never;

describe("useFieldOps — insertField", () => {
  it("place les nouveaux champs en cartes 2×2 côte à côte", () => {
    const m = monde([]);
    m.ops().insertField((id) => champ(id));
    m.ops().insertField((id) => champ(id));
    expect(ids(m.champs())).toEqual(["champ1", "champ2"]);
    expect(m.champs()[0].layout).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(m.champs()[1].layout).toEqual({ x: 2, y: 0, w: 2, h: 2 });
    expect(m.statut()).toBe("dirty");
  });

  it("respecte un layout existant et ouvre sa config", () => {
    const m = monde([{ id: "a", label: "a", kind: "text", layout: { x: 0, y: 0, w: 6, h: 4 } }]);
    m.ops().insertField((id) => champ(id));
    expect(m.champs()[1].layout).toEqual({ x: 6, y: 0, w: 2, h: 2 });
    expect(m.ouverts()).toEqual(new Set(["champ2"]));
  });

  it("id libre : saute un champ de la palette déjà présent", () => {
    const m = monde([champ("champ4"), champ("x"), champ("y")]);
    m.ops().insertField((id) => champ(id));
    expect(ids(m.champs())).toContain("champ5");
  });
});

describe("useFieldOps — handleDrop (palette → canvas)", () => {
  it("clé inconnue : rien inséré", () => {
    const m = monde([champ("a")]);
    m.poserDrag({ key: "clave-inexistante" });
    m.ops().handleDrop(evt);
    expect(ids(m.champs())).toEqual(["a"]);
  });

  it("clé connue : champ inséré à la cellule visée", () => {
    const m = monde([champ("a")]);
    m.poserDrag({ key: "textarea" });
    m.ops().handleDrop(evt);
    expect(ids(m.champs())).toEqual(["a", "champ2"]);
    // Chaque kind garde sa hauteur par défaut : un texte long naît en 6 rangées.
    expect(m.champs()[1].layout).toEqual({
      x: 10,
      y: 4,
      w: 2,
      h: 6,
    });
  });

  it("sans drag en cours : aucun changement", () => {
    const m = monde([champ("a"), champ("b")]);
    m.ops().handleDrop(evt);
    expect(ids(m.champs())).toEqual(["a", "b"]);
    expect(m.statut()).toBe("idle");
  });
});

describe("useFieldOps — patchField / patchColumn", () => {
  it("index hors bornes : aucun champ modifié", () => {
    const m = monde([champ("a"), champ("b")]);
    m.ops().patchField(99, (f) => ({ ...f, label: "changé" }));
    m.ops().patchField(-1, (f) => ({ ...f, label: "changé" }));
    expect(m.champs().map((f) => f.label)).toEqual(["a", "b"]);
  });

  it("index valide : seul le champ visé est modifié", () => {
    const m = monde([champ("a"), champ("b")]);
    m.ops().patchField(1, (f) => ({ ...f, label: "changé" }));
    expect(m.champs().map((f) => f.label)).toEqual(["a", "changé"]);
    expect(m.statut()).toBe("dirty");
  });

  it("patchColumn sur un champ non-liste : ignoré sans erreur", () => {
    const m = monde([champ("a")]);
    m.ops().patchColumn(0, 0, (c) => ({ ...c, label: "changé" }));
    expect(m.champs()[0].label).toBe("a");
  });
});

describe("useFieldOps — toggleCfg", () => {
  it("ajoute puis retire la config ouverte, par id de champ", () => {
    const m = monde([champ("a")]);
    m.ops().toggleCfg("a");
    expect(m.ouverts()).toEqual(new Set(["a"]));
    m.ops().toggleCfg("a");
    expect(m.ouverts()).toEqual(new Set());
  });

  it("une insertion ne déplace pas la config ouverte", () => {
    const m = monde([champ("a")]);
    m.ops().toggleCfg("a");
    m.ops().insertField((id) => champ(id));
    expect(m.ouverts()).toEqual(new Set(["a"]));
  });
});
