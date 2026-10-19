import { describe, expect, it } from "vitest";
import { clampOptionIndex, parseOptions, tallyVotes } from "./vote-logic";

describe("clampOptionIndex", () => {
  it("ramène l'index dans les bornes [0, n-1]", () => {
    expect(clampOptionIndex(0, 3)).toBe(0);
    expect(clampOptionIndex(2, 3)).toBe(2);
    expect(clampOptionIndex(-4, 3)).toBe(0);
    expect(clampOptionIndex(99, 3)).toBe(2);
    expect(clampOptionIndex(1.9, 3)).toBe(1);
  });

  it("refuse une valeur non finie ou un découpage vide", () => {
    expect(clampOptionIndex(Number.NaN, 3)).toBeNull();
    expect(clampOptionIndex(Number.POSITIVE_INFINITY, 3)).toBeNull();
    expect(clampOptionIndex(1, 0)).toBeNull();
  });
});

describe("parseOptions", () => {
  it("accepte 2..6 libellés non vides (trim)", () => {
    expect(parseOptions(["Oui", "Non"])).toEqual(["Oui", "Non"]);
    expect(parseOptions([" A ", "B", "C", "D", "E", "F"])).toEqual(["A", "B", "C", "D", "E", "F"]);
  });

  it("refuse 1 option, 7 options, libellé vide ou non-string", () => {
    expect(parseOptions(["seul"])).toBeNull();
    expect(parseOptions(["1", "2", "3", "4", "5", "6", "7"])).toBeNull();
    expect(parseOptions(["ok", "  "])).toBeNull();
    expect(parseOptions(["ok", 42])).toBeNull();
    expect(parseOptions("pas-un-tableau")).toBeNull();
  });
});

describe("tallyVotes", () => {
  it("compte les votes par option et clamp les index hors bornes", () => {
    const votes = [
      { userId: "u1", optionIndex: 0 },
      { userId: "u2", optionIndex: 1 },
      { userId: "u3", optionIndex: 9 },
    ];
    expect(tallyVotes(votes, 3)).toEqual([1, 1, 1]);
  });

  it("unicité : un seul vote par joueur, dernière modification gagnante", () => {
    const votes = [
      { userId: "u1", optionIndex: 0 },
      { userId: "u2", optionIndex: 1 },
      { userId: "u1", optionIndex: 2 }, // modification du vote de u1
    ];
    expect(tallyVotes(votes, 3)).toEqual([0, 1, 1]);
    expect(tallyVotes([], 3)).toEqual([0, 0, 0]);
  });
});
