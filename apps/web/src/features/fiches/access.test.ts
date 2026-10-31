import { describe, expect, it } from "vitest";
import { canEditEntity, visibleEntityWhere, type EntityAccess } from "./access";

const player = (over: Partial<EntityAccess> = {}): EntityAccess => ({
  role: "PLAYER",
  assigneeIds: ["u1"],
  gmOnly: false,
  ...over,
});

describe("canEditEntity", () => {
  it("le MJ édite tout, même non assigné ou secret", () => {
    expect(canEditEntity({ role: "GM", assigneeIds: [], gmOnly: true }, "gm")).toBe(true);
    expect(canEditEntity({ role: "GM", assigneeIds: ["u1"], gmOnly: false }, "gm")).toBe(true);
  });

  it("un joueur édite une fiche qui lui est assignée", () => {
    expect(canEditEntity(player(), "u1")).toBe(true);
  });

  it("une fiche sans assigné reste en lecture seule pour un joueur", () => {
    expect(canEditEntity(player({ assigneeIds: [] }), "u1")).toBe(false);
  });

  it("un joueur n'édite pas une fiche assignée à un autre", () => {
    expect(canEditEntity(player(), "u2")).toBe(false);
  });

  it("une fiche gmOnly reste MJ même si le joueur est assigné", () => {
    expect(canEditEntity(player({ gmOnly: true }), "u1")).toBe(false);
  });
});

describe("visibleEntityWhere", () => {
  it("le MJ n'a aucun filtre", () => {
    expect(visibleEntityWhere("GM", "gm")).toEqual({});
  });

  it("le joueur voit les fiches non-MJ sans assigné ou à lui", () => {
    expect(visibleEntityWhere("PLAYER", "u1")).toEqual({
      gmOnly: false,
      OR: [{ assignees: { none: {} } }, { assignees: { some: { userId: "u1" } } }],
    });
  });

  it("se compose avec le filtre de campagne sans perdre la clause assignés", () => {
    expect({ campaignId: "c1", ...visibleEntityWhere("PLAYER", "u1") }).toEqual({
      campaignId: "c1",
      gmOnly: false,
      OR: [{ assignees: { none: {} } }, { assignees: { some: { userId: "u1" } } }],
    });
  });
});
