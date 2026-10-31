import { describe, expect, it } from "vitest";
import {
  MAX_COVER_CHARS,
  NOVEL_GENRES,
  canReadChapter,
  canReadNovel,
  canReuseShareToken,
  chapterStatusPatch,
  countDocWords,
  isPlainObject,
  isValidCoverImage,
  mergeGenres,
  moveItem,
  parseTags,
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

describe("mergeGenres (liste des genres)", () => {
  it("garde la liste connue puis ajoute les genres inconnus, sans doublon", () => {
    const out = mergeGenres([null, "Fantasy", "narratif", "narratif"]);
    expect(out.slice(0, NOVEL_GENRES.length)).toEqual([...NOVEL_GENRES]);
    expect(out.slice(NOVEL_GENRES.length)).toEqual(["narratif"]);
  });
});

describe("parseTags (saisie CSV des tags)", () => {
  it("nettoie, dédoublonne et ignore les vides", () => {
    expect(parseTags("a, b ,a,, c")).toEqual(["a", "b", "c"]);
  });

  it("ignore un tag de 41 caractères", () => {
    expect(parseTags(`${"a".repeat(41)}, ok`)).toEqual(["ok"]);
    expect(parseTags("a".repeat(40))).toEqual(["a".repeat(40)]);
  });

  it("plafonne à 10 tags", () => {
    const input = Array.from({ length: 15 }, (_, i) => `tag${i}`).join(",");
    expect(parseTags(input)).toHaveLength(10);
  });

  it("renvoie un tableau vide sans contenu utile", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags("  , ,")).toEqual([]);
  });
});

describe("canReuseShareToken (rotation des liens de partage)", () => {
  it("garde le token quand le mode ne change pas", () => {
    expect(canReuseShareToken("read", "read")).toBe(true);
    expect(canReuseShareToken("review", "review")).toBe(true);
    expect(canReuseShareToken("edit", "edit")).toBe(true);
  });

  it("tourne le token à chaque changement de mode", () => {
    expect(canReuseShareToken("read", "review")).toBe(false);
    expect(canReuseShareToken("read", "edit")).toBe(false);
    expect(canReuseShareToken("review", "edit")).toBe(false);
    expect(canReuseShareToken("edit", "review")).toBe(false);
  });

  it("ne réutilise pas un mode absent", () => {
    expect(canReuseShareToken(null, "read")).toBe(false);
    expect(canReuseShareToken(null, "review")).toBe(false);
    expect(canReuseShareToken(null, "edit")).toBe(false);
  });
});

describe("canReadNovel (autorisations de lecture)", () => {
  it("autorise les membres quel que soit le statut", () => {
    expect(canReadNovel("author", "draft")).toBe(true);
    expect(canReadNovel("editor", "draft")).toBe(true);
  });

  it("autorise l'anonyme sur un roman publié uniquement", () => {
    expect(canReadNovel(null, "published")).toBe(true);
    expect(canReadNovel(null, "draft")).toBe(false);
    expect(canReadNovel(null, "writing")).toBe(false);
  });
});

describe("canReadChapter (autorisations de lecture)", () => {
  it("autorise les membres quel que soit le statut du chapitre", () => {
    expect(canReadChapter("editor", "draft", "draft")).toBe(true);
  });

  it("n'autorise l'anonyme que sur un chapitre publié d'un roman publié", () => {
    expect(canReadChapter(null, "published", "published")).toBe(true);
    expect(canReadChapter(null, "published", "review")).toBe(false);
    expect(canReadChapter(null, "published", "draft")).toBe(false);
    expect(canReadChapter(null, "draft", "published")).toBe(false);
    expect(canReadChapter(null, "writing", "published")).toBe(false);
  });
});
