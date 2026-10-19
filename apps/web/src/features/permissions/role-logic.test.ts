import { describe, expect, it } from "vitest";
import { roleChangeError, type RoleChangeInput } from "./role-logic";

const GM = "gm-user";
const OTHER = "other-user";

function input(over: Partial<RoleChangeInput> = {}): RoleChangeInput {
  return {
    actorRole: "GM",
    actorUserId: GM,
    targetUserId: OTHER,
    targetRole: "PLAYER",
    nextRole: "GM",
    gmCount: 2,
    ...over,
  };
}

describe("roleChangeError", () => {
  it("refuse un acteur qui n'est pas MJ", () => {
    expect(roleChangeError(input({ actorRole: "PLAYER" }))).toBe("Réservé aux MJ.");
  });

  it("no-op : même rôle = autorisé sans écriture", () => {
    expect(roleChangeError(input({ nextRole: "PLAYER" }))).toBeNull();
    expect(roleChangeError(input({ targetRole: "GM", nextRole: "GM" }))).toBeNull();
  });

  it("autorise promotion et rétrogradation d'un autre joueur", () => {
    expect(roleChangeError(input())).toBeNull(); // PLAYER → GM
    expect(roleChangeError(input({ targetRole: "GM", nextRole: "PLAYER", gmCount: 3 }))).toBeNull();
  });

  it("interdit de dégrader son propre rôle, même avec d'autres MJ", () => {
    const err = roleChangeError(
      input({ targetUserId: GM, targetRole: "GM", nextRole: "PLAYER", gmCount: 2 }),
    );
    expect(err).toBe("Impossible de rétrograder son propre rôle.");
  });

  it("protège le dernier MJ (cible ≠ acteur, défense contre état incohérent)", () => {
    const err = roleChangeError(input({ targetRole: "GM", nextRole: "PLAYER", gmCount: 1 }));
    expect(err).toBe("Impossible de rétrograder le dernier MJ.");
  });
});
