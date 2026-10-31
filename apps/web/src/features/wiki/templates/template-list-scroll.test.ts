import { describe, expect, it } from "vitest";
import { scrollEdgesOf } from "./template-list-scroll";

describe("scrollEdgesOf", () => {
  it("aucun débordement : les deux chevrons sont inactifs", () => {
    expect(scrollEdgesOf({ scrollLeft: 0, clientWidth: 300, scrollWidth: 300 })).toEqual({
      left: false,
      right: false,
    });
  });

  it("début de zone : seul le chevron droit est actif", () => {
    expect(scrollEdgesOf({ scrollLeft: 0, clientWidth: 300, scrollWidth: 600 })).toEqual({
      left: false,
      right: true,
    });
  });

  it("milieu de zone : les deux chevrons sont actifs", () => {
    expect(scrollEdgesOf({ scrollLeft: 150, clientWidth: 300, scrollWidth: 600 })).toEqual({
      left: true,
      right: true,
    });
  });

  it("fin de zone : seul le chevron gauche est actif", () => {
    expect(scrollEdgesOf({ scrollLeft: 300, clientWidth: 300, scrollWidth: 600 })).toEqual({
      left: true,
      right: false,
    });
  });
});
