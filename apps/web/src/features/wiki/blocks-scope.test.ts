import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { EditorState } from "@tiptap/pm/state";
import type { Node } from "@tiptap/pm/model";
import {
  deleteBlockAt,
  isBlockInGmSecret,
  isInsideGmSecret,
  scopedContent,
  unwrapBlockFromSecret,
  wrapBlockInSecret,
} from "./blocks-scope";
import { DiceBlockNode, GmSecretNode, MetaBlockNode, TableBlockNode } from "./extensions";

// Schéma réel de l'éditeur (sans vue React ni DOM) : les transforms ci-dessous
// s'exercent sur les nœuds gm-secret / blocs tels que l'éditeur les déclare.
const schema = getSchema([
  StarterKit.configure({ heading: false, link: false }),
  GmSecretNode,
  MetaBlockNode,
  DiceBlockNode,
  TableBlockNode,
]);

function stateOf(...content: Node[]): EditorState {
  return EditorState.create({ schema, doc: schema.node("doc", null, content) });
}

const meta = () => schema.nodes.metaBlock.create({ kind: "custom", label: "Ère", value: "X" });
const dice = () => schema.nodes.diceBlock.create({ label: "Jet", expr: "1d20" });
const secretOf = (block: Node) =>
  schema.nodes.gmSecret.create(null, [block, schema.nodes.paragraph.create()]);

describe("isInsideGmSecret", () => {
  it("false sur un document sans secret", () => {
    expect(isInsideGmSecret(stateOf(meta(), schema.nodes.paragraph.create()), 0)).toBe(false);
  });

  it("true pour une position à l'intérieur d'un secret", () => {
    const state = stateOf(secretOf(meta()));
    expect(isInsideGmSecret(state, 1)).toBe(true);
  });
});

describe("scopedContent", () => {
  const block = { type: "metaBlock", attrs: { kind: "custom", label: "Ère", value: "" } };

  it("portée tous : contenu inséré tel quel", () => {
    const state = stateOf(schema.nodes.paragraph.create());
    expect(scopedContent(state, block, false, 0)).toBe(block);
  });

  it("portée MJ : enveloppé dans <gm-secret> + paragraphe", () => {
    const state = stateOf(schema.nodes.paragraph.create());
    expect(scopedContent(state, block, true, 0)).toEqual({
      type: "gmSecret",
      content: [block, { type: "paragraph" }],
    });
  });

  it("déjà dans un secret : pas de double enveloppe", () => {
    const state = stateOf(secretOf(meta()));
    expect(scopedContent(state, block, true, 1)).toBe(block);
  });
});

describe("wrapBlockInSecret / unwrapBlockFromSecret", () => {
  it("enveloppe un bloc et sort dissous le secret", () => {
    const start = stateOf(meta());
    const wrapped = wrapBlockInSecret(start, 0);
    expect(wrapped).not.toBeNull();

    const inside = start.apply(wrapped!);
    expect(inside.doc.firstChild?.type.name).toBe("gmSecret");
    expect(inside.doc.firstChild?.childCount).toBe(2);
    expect(isBlockInGmSecret(inside, 1)).toBe(true);

    const unwrapped = unwrapBlockFromSecret(inside, 1);
    expect(unwrapped).not.toBeNull();
    const out = inside.apply(unwrapped!);
    expect(out.doc.childCount).toBe(2);
    expect(out.doc.firstChild?.type.name).toBe("metaBlock");
    expect(isBlockInGmSecret(out, 0)).toBe(false);
  });

  it("tous les kinds de bloc sont concernés", () => {
    for (const block of [meta(), dice(), schema.nodes.tableBlock.create()]) {
      const state = stateOf(block);
      const tr = wrapBlockInSecret(state, 0);
      expect(tr, block.type.name).not.toBeNull();
      expect(state.apply(tr!).doc.firstChild?.type.name, block.type.name).toBe("gmSecret");
    }
  });

  it("refuse un double wrap, un unwrap hors secret et une position non-bloc", () => {
    const already = stateOf(secretOf(meta()));
    expect(wrapBlockInSecret(already, 1)).toBeNull();

    const plain = stateOf(meta());
    expect(unwrapBlockFromSecret(plain, 0)).toBeNull();

    // Position d'un paragraphe : ni wrap ni unwrap.
    const para = stateOf(schema.nodes.paragraph.create());
    expect(wrapBlockInSecret(para, 0)).toBeNull();
    expect(unwrapBlockFromSecret(para, 0)).toBeNull();
  });
});

describe("deleteBlockAt", () => {
  const para = () => schema.nodes.paragraph.create();
  const textPara = () => schema.nodes.paragraph.create(null, schema.text("Notes MJ"));

  it("emporte le <gm-secret> vidé par la suppression du bloc", () => {
    const start = stateOf(secretOf(meta()), para());
    const tr = deleteBlockAt(start, 1);
    expect(tr).not.toBeNull();

    const out = start.apply(tr!);
    expect(out.doc.childCount).toBe(1);
    expect(out.doc.firstChild?.type.name).toBe("paragraph");
    expect(out.doc.firstChild?.type.name).not.toBe("gmSecret");
  });

  it("secret sans paragraphe de confort : le wrapper part aussi", () => {
    const start = stateOf(schema.nodes.gmSecret.create(null, [meta()]));
    const tr = deleteBlockAt(start, 1);
    expect(tr).not.toBeNull();

    // PM recadre le doc (`block+`) : le secret a disparu, un paragraphe
    // vide le remplace — plus aucune enveloppe MJ orpheline.
    const out = start.apply(tr!);
    expect(out.doc.childCount).toBe(1);
    expect(out.doc.firstChild?.type.name).toBe("paragraph");
  });

  it("garde le secret s'il reste du contenu MJ", () => {
    const start = stateOf(schema.nodes.gmSecret.create(null, [meta(), textPara()]), para());
    const tr = deleteBlockAt(start, 1);
    expect(tr).not.toBeNull();

    const out = start.apply(tr!);
    expect(out.doc.childCount).toBe(2);
    expect(out.doc.firstChild?.type.name).toBe("gmSecret");
    expect(out.doc.firstChild?.textContent).toBe("Notes MJ");
  });

  it("deux blocs dans un secret : le wrapper survit au premier", () => {
    const start = stateOf(schema.nodes.gmSecret.create(null, [meta(), dice(), para()]));
    const tr = deleteBlockAt(start, 1);
    expect(tr).not.toBeNull();

    const out = start.apply(tr!);
    expect(out.doc.firstChild?.type.name).toBe("gmSecret");
    expect(out.doc.firstChild?.childCount).toBe(2);
    expect(out.doc.firstChild?.firstChild?.type.name).toBe("diceBlock");
  });

  it("hors secret : suppression simple, position non-bloc refusée", () => {
    const start = stateOf(meta(), para());
    const tr = deleteBlockAt(start, 0);
    expect(tr).not.toBeNull();
    const out = start.apply(tr!);
    expect(out.doc.childCount).toBe(1);
    expect(out.doc.firstChild?.type.name).toBe("paragraph");

    expect(deleteBlockAt(stateOf(para()), 0)).toBeNull();
  });
});
