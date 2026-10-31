import { describe, expect, it } from "vitest";
import { isChoiceStatus, toChoiceView, type ChoiceRow } from "./choice-view";

function row(overrides: Partial<ChoiceRow> = {}): ChoiceRow {
  return {
    id: "c1",
    prompt: "Route ?",
    options: ["Nord", "Sud"],
    status: "open",
    resolvedOption: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    votes: [
      { userId: "u1", optionIndex: 0, comment: "secret MJ" },
      { userId: "u2", optionIndex: 1, comment: null },
    ],
    ...overrides,
  };
}

describe("isChoiceStatus", () => {
  it("accepte les quatre états et rejette le reste", () => {
    for (const status of ["open", "closed", "resolved", "archived"]) {
      expect(isChoiceStatus(status)).toBe(true);
    }
    expect(isChoiceStatus("paused")).toBe(false);
  });
});

describe("toChoiceView", () => {
  it("mappe l'état, les compteurs et le vote du lecteur", () => {
    const view = toChoiceView(row({ status: "closed" }), "u1", false);
    expect(view).toMatchObject({
      id: "c1",
      status: "closed",
      counts: [1, 1],
      myVote: { optionIndex: 0, comment: "secret MJ" },
      comments: [],
    });
  });

  it("ne descend les commentaires que pour le MJ", () => {
    const player = toChoiceView(row(), "u1", false);
    const gm = toChoiceView(row(), "u1", true);
    expect(player?.comments).toEqual([]);
    expect(gm?.comments).toEqual([{ optionIndex: 0, comment: "secret MJ" }]);
  });

  it("retombe sur open pour un état inconnu et ignore une ligne corrompue", () => {
    expect(toChoiceView(row({ status: "paused" }), "u1", false)?.status).toBe("open");
    expect(toChoiceView(row({ options: ["seul"] }), "u1", false)).toBeNull();
  });
});
