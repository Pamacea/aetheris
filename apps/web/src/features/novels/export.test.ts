import { describe, expect, it } from "vitest";
import {
  EXPORT_README,
  NOVEL_EXPORT_FORMAT,
  NOVEL_EXPORT_VERSION,
  archiveFileName,
  asciiSlug,
  docToText,
  novelFileName,
  serializeNovel,
  type NovelExportSource,
} from "./export";

function source(): NovelExportSource {
  return {
    id: "novel-1",
    title: "Les Ombres",
    synopsis: "Un synopsis.",
    status: "writing",
    genre: "Fantasy",
    tags: ["magie", "complot"],
    coverImage: "https://example.com/cover.jpg",
    createdAt: new Date("2026-01-02T03:04:05.000Z"),
    updatedAt: new Date("2026-02-03T04:05:06.000Z"),
    chapters: [
      {
        id: "ch-2",
        title: "Deuxième",
        position: 1,
        status: "draft",
        wordCount: 3,
        publishedAt: null,
        createdAt: new Date("2026-01-05T00:00:00.000Z"),
        updatedAt: new Date("2026-01-06T00:00:00.000Z"),
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Deux" }] }],
        },
      },
      {
        id: "ch-1",
        title: "Premier",
        position: 0,
        status: "published",
        wordCount: 5,
        publishedAt: new Date("2026-01-07T00:00:00.000Z"),
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
        updatedAt: new Date("2026-01-04T00:00:00.000Z"),
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Un" }] }],
        },
      },
    ],
  };
}

const exportedAt = new Date("2026-11-01T10:00:00.000Z");

describe("docToText", () => {
  it("aplatit paragraphes, titres et sauts de ligne", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bonjour " },
            { type: "text", text: "monde", marks: [{ type: "bold" }] },
          ],
        },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Chapitre" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "a" },
            { type: "hardBreak" },
            { type: "text", text: "b" },
          ],
        },
      ],
    };

    expect(docToText(doc)).toBe("Bonjour monde\nChapitre\na\nb");
  });

  it("renvoie une chaîne vide pour un contenu absent ou invalide", () => {
    expect(docToText(null)).toBe("");
    expect(docToText("pas un document")).toBe("");
    expect(docToText({ type: "doc" })).toBe("");
  });
});

describe("serializeNovel", () => {
  it("trie les chapitres par position et conserve tous les champs", () => {
    const out = serializeNovel(source(), exportedAt);

    expect(out.chapters.map((c) => c.id)).toEqual(["ch-1", "ch-2"]);
    expect(out).toMatchObject({
      format: NOVEL_EXPORT_FORMAT,
      version: NOVEL_EXPORT_VERSION,
      exportedAt: "2026-11-01T10:00:00.000Z",
      id: "novel-1",
      title: "Les Ombres",
      synopsis: "Un synopsis.",
      status: "writing",
      genre: "Fantasy",
      tags: ["magie", "complot"],
      coverImage: "https://example.com/cover.jpg",
      createdAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-02-03T04:05:06.000Z",
    });
    expect(out.chapters[0]).toMatchObject({
      title: "Premier",
      position: 0,
      status: "published",
      wordCount: 5,
      publishedAt: "2026-01-07T00:00:00.000Z",
      text: "Un",
    });
  });

  it("produit un JSON non vide et réutilisable", () => {
    const json = JSON.stringify(serializeNovel(source(), exportedAt));
    expect(json.length).toBeGreaterThan(100);

    const parsed = JSON.parse(json) as { chapters: Array<{ content: unknown; text: string }> };
    expect(parsed.chapters).toHaveLength(2);
    expect(parsed.chapters[0]?.content).toEqual(source().chapters[1]?.content);
    expect(parsed.chapters[0]?.text).toBe("Un");
  });

  it("ne modifie pas le tableau de chapitres source", () => {
    const input = source();
    const before = input.chapters.map((c) => c.id);
    serializeNovel(input, exportedAt);
    expect(input.chapters.map((c) => c.id)).toEqual(before);
  });
});

describe("noms de fichiers", () => {
  it("normalise accents, espaces et ponctuation en ASCII", () => {
    expect(novelFileName("Été à Paris / 2026", 0)).toBe("01-ete-a-paris-2026.json");
    expect(asciiSlug("Crème brûlée !")).toBe("creme-brulee");
  });

  it("préfixe par l'index pour éviter les collisions", () => {
    expect(novelFileName("Même titre", 0)).toBe("01-meme-titre.json");
    expect(novelFileName("Même titre", 1)).toBe("02-meme-titre.json");
  });

  it("replie sur « roman » et borne la longueur", () => {
    expect(novelFileName("!!!", 4)).toBe("05-roman.json");
    expect(novelFileName("a".repeat(100), 0).length).toBeLessThanOrEqual(68);
  });

  it("nomme l'archive avec une date ASCII safe", () => {
    expect(archiveFileName(exportedAt)).toBe("aetheris-romans-2026-11-01.zip");
    expect(archiveFileName(exportedAt)).toMatch(/^[\x20-\x7e]+$/);
  });
});

describe("lisez-moi", () => {
  it("explique le format et le périmètre", () => {
    expect(EXPORT_README).toContain("JSON");
    expect(EXPORT_README).toContain("auteur");
    expect(EXPORT_README).toContain("images");
  });
});
