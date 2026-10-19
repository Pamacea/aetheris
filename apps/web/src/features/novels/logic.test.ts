import { describe, expect, it } from "vitest";
import {
  MAX_COVER_CHARS,
  chapterStatusPatch,
  countDocWords,
  isPlainObject,
  isValidCoverImage,
  moveItem,
  toPlainDoc,
} from "./logic";

describe("moveItem (réordonnancement des chapitres)", () => {
  const ids = ["a", "b", "c", "d"];

  it("déplace un élément vers la droite", () => {
    expect(moveItem(ids, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("déplace un élément vers la gauche", () => {
    expect(moveItem(ids, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("n'altère pas le tableau d'origine", () => {
    const copy = [...ids];
    moveItem(ids, 0, 3);
    expect(ids).toEqual(copy);
  });

  it("ignore un déplacement nul ou hors bornes", () => {
    expect(moveItem(ids, 1, 1)).toEqual(ids);
    expect(moveItem(ids, -1, 2)).toEqual(ids);
    expect(moveItem(ids, 0, 99)).toEqual(ids);
    expect(moveItem(ids, 99, 0)).toEqual(ids);
  });
});

describe("chapterStatusPatch (transitions de statut)", () => {
  it("publie avec une date", () => {
    const patch = chapterStatusPatch("published");
    expect(patch.publishedAt).toBeInstanceOf(Date);
  });

  it("efface la date en brouillon comme en relecture", () => {
    expect(chapterStatusPatch("draft").publishedAt).toBeNull();
    expect(chapterStatusPatch("review").publishedAt).toBeNull();
  });
});

describe("countDocWords (comptage serveur)", () => {
  it("compte les mots de tous les nœuds text imbriqués", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Le port est noir" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "une lueur" }] }],
            },
          ],
        },
      ],
    };
    expect(countDocWords(doc)).toBe(6);
  });

  it("renvoie 0 pour un document vide ou malformé", () => {
    expect(countDocWords({ type: "doc" })).toBe(0);
    expect(countDocWords(null)).toBe(0);
    expect(countDocWords("un texte")).toBe(0);
    expect(countDocWords([1, 2])).toBe(0);
  });
});

describe("toPlainDoc (attrs ProseMirror sans prototype)", () => {
  it("reconstruit des objets à prototype Object pour tous les attrs imbriqués", () => {
    const attrs = Object.create(null) as Record<string, unknown>;
    attrs.textAlign = "center";
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", attrs, content: [{ type: "text", text: "salut" }] }],
    };

    const plain = toPlainDoc(doc);
    expect(Object.getPrototypeOf(plain)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(plain.content![0]!.attrs)).toBe(Object.prototype);
    expect(plain.content![0]!.attrs).toEqual({ textAlign: "center" });
    expect(JSON.parse(JSON.stringify(plain))).toEqual(plain);
  });

  it("laisse les scalaires et null intacts", () => {
    expect(toPlainDoc(null)).toBeNull();
    expect(toPlainDoc(42)).toBe(42);
    expect(toPlainDoc("x")).toBe("x");
  });
});

describe("isPlainObject", () => {
  it("accepte les objets, refuse tableaux et scalaires", () => {
    expect(isPlainObject({ type: "doc" })).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject("doc")).toBe(false);
  });
});

describe("isValidCoverImage (frontière de confiance)", () => {
  it("accepte l'absence de couverture et les data-url image raisonnables", () => {
    expect(isValidCoverImage(null)).toBe(true);
    expect(isValidCoverImage(undefined)).toBe(true);
    expect(isValidCoverImage("")).toBe(true);
    expect(isValidCoverImage("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isValidCoverImage("https://example.org/cover.png")).toBe(true);
  });

  it("refuse les images trop lourdes, les types non-image et les URL suspectes", () => {
    expect(isValidCoverImage(`data:image/png;base64,${"A".repeat(MAX_COVER_CHARS)}`)).toBe(false);
    expect(isValidCoverImage("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isValidCoverImage("javascript:alert(1)")).toBe(false);
    expect(isValidCoverImage(`https://example.org/${"a".repeat(3_000)}`)).toBe(false);
  });
});
