import { describe, expect, it } from "vitest";
import type { TemplateField } from "@aetheris/shared";
import type { WikiTemplateMeta } from "../types";
import type { BuilderState } from "./builder-state";
// Alias local : ces ops sont des fermetures pures, pas un hook React,
// donc appelées hors composant (la règle rules-of-hooks verrait un « use »).
import { useFieldOps as creerOps } from "./builder-ops";

type Drag = { source: "palette"; key: string } | { source: "row"; index: number } | null;

const champ = (id: string): TemplateField => ({ id, label: id, kind: "text" });
const ids = (l: TemplateField[]) => l.map((f) => f.id);

/** État de builder simulé : un seul template, rendu synchrone (pas de React). */
function monde(initial: TemplateField[]) {
  let items: WikiTemplateMeta[] = [
    { id: "t1", name: "Fiche", category: null, schema: { fields: initial } },
  ];
  let status = "idle";
  let openCfg = new Set<number>();
  let drag: Drag = null;
  let dragOver: number | null = null;

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
    listRef: { current: null },
    drag,
    setDrag: (v: Drag) => {
      drag = v;
    },
    dragOver,
    setDragOver: (v: number | null) => {
      dragOver = v;
    },
    setOpenCfg: (v: Set<number> | ((prev: Set<number>) => Set<number>)) => {
      openCfg = typeof v === "function" ? v(openCfg) : v;
    },
  });

  return {
    /** Nouvelles ops : en React, chaque mutation re-rend et recrée les closures. */
    ops: () => creerOps(etat() as unknown as BuilderState),
    champs: champsDe,
    ouverts: () => openCfg,
    statut: () => status,
    poserDrag: (d: Drag, at: number | null) => {
      drag = d;
      dragOver = at;
    },
  };
}

const evt = { preventDefault: () => {}, clientY: 0 } as never;

describe("useFieldOps — insertField", () => {
  it("index négatif ramené à 0 (insertion en tête)", () => {
    const m = monde([champ("a")]);
    m.ops().insertField((id) => champ(id), -5);
    expect(ids(m.champs())).toEqual(["champ2", "a"]);
    expect(m.ouverts()).toEqual(new Set([0]));
    expect(m.statut()).toBe("dirty");
  });

  it("index supérieur à la taille ramené à la fin", () => {
    const m = monde([champ("a")]);
    m.ops().insertField((id) => champ(id), 99);
    expect(ids(m.champs())).toEqual(["a", "champ2"]);
    expect(m.ouverts()).toEqual(new Set([1]));
  });

  it("id libre : saute un champ de la palette déjà présent", () => {
    const m = monde([champ("champ4"), champ("x"), champ("y")]);
    m.ops().insertField((id) => champ(id), 0);
    expect(ids(m.champs())[0]).toBe("champ5");
  });

  it("champ de palette : clé inconnue → rien inséré", () => {
    const m = monde([champ("a")]);
    m.poserDrag({ source: "palette", key: "clave-inexistante" }, 0);
    m.ops().handleDrop(evt);
    expect(ids(m.champs())).toEqual(["a"]);
  });

  it("champ de palette : clé connue → champ inséré à l'index survolé", () => {
    const m = monde([champ("a")]);
    m.poserDrag({ source: "palette", key: "textarea" }, 1);
    m.ops().handleDrop(evt);
    expect(ids(m.champs())).toEqual(["a", "champ2"]);
  });
});

describe("useFieldOps — moveField (réordonnement)", () => {
  it("premier rang vers le haut : borné, ordre inchangé", () => {
    const m = monde([champ("a"), champ("b")]);
    m.ops().moveField(0, -1);
    expect(ids(m.champs())).toEqual(["a", "b"]);
    expect(m.statut()).toBe("idle");
  });

  it("dernier rang vers le bas : borné, ordre inchangé", () => {
    const m = monde([champ("a"), champ("b")]);
    m.ops().moveField(1, 1);
    expect(ids(m.champs())).toEqual(["a", "b"]);
  });

  it("déplacement vers le haut : échange des deux rangs", () => {
    const m = monde([champ("a"), champ("b"), champ("c")]);
    m.ops().moveField(1, -1);
    expect(ids(m.champs())).toEqual(["b", "a", "c"]);
  });

  it("déplacement vers le bas : échange des deux rangs", () => {
    const m = monde([champ("a"), champ("b"), champ("c")]);
    m.ops().moveField(1, 1);
    expect(ids(m.champs())).toEqual(["a", "c", "b"]);
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

describe("useFieldOps — handleDrop (glisser un rang)", () => {
  it("rang déplacé vers le bas", () => {
    const m = monde([champ("a"), champ("b"), champ("c")]);
    m.poserDrag({ source: "row", index: 0 }, 3);
    m.ops().handleDrop(evt);
    expect(ids(m.champs())).toEqual(["b", "c", "a"]);
  });

  it("rang déplacé vers le haut", () => {
    const m = monde([champ("a"), champ("b"), champ("c")]);
    m.poserDrag({ source: "row", index: 2 }, 0);
    m.ops().handleDrop(evt);
    expect(ids(m.champs())).toEqual(["c", "a", "b"]);
  });

  it("départ = arrivée : aucun changement", () => {
    const m = monde([champ("a"), champ("b")]);
    m.poserDrag({ source: "row", index: 1 }, 1);
    m.ops().handleDrop(evt);
    expect(ids(m.champs())).toEqual(["a", "b"]);
    expect(m.statut()).toBe("idle");
  });

  it("index de départ hors bornes : aucun changement", () => {
    const m = monde([champ("a"), champ("b")]);
    m.poserDrag({ source: "row", index: 7 }, 0);
    m.ops().handleDrop(evt);
    expect(ids(m.champs())).toEqual(["a", "b"]);
  });

  it("sans drag en cours : seul le nettoyage est fait", () => {
    const m = monde([champ("a"), champ("b")]);
    m.ops().handleDrop(evt);
    expect(ids(m.champs())).toEqual(["a", "b"]);
    expect(m.statut()).toBe("idle");
  });
});

describe("useFieldOps — toggleCfg", () => {
  it("ajoute puis retire un index de config ouverte", () => {
    const m = monde([champ("a")]);
    m.ops().toggleCfg(0);
    expect(m.ouverts()).toEqual(new Set([0]));
    m.ops().toggleCfg(0);
    expect(m.ouverts()).toEqual(new Set());
  });
});
