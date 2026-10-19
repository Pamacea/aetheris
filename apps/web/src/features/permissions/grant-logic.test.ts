import { describe, expect, it } from "vitest";
import { canViewModule } from "@/lib/grants";
import { applyViewGrant, viewGrantError } from "./grant-logic";

describe("viewGrantError", () => {
  it("refuse un moduleId invalide", () => {
    expect(viewGrantError("Journal", "PLAYER")).toBe("Module invalide.");
    expect(viewGrantError("../etc", "PLAYER")).toBe("Module invalide.");
    expect(viewGrantError("", "PLAYER")).toBe("Module invalide.");
  });

  it("refuse d'écrire sur un MJ (il voit toujours tout)", () => {
    expect(viewGrantError("journal", "GM")).toBe("Le MJ voit toujours tout.");
  });

  it("accepte un module valide pour un joueur", () => {
    expect(viewGrantError("journal", "PLAYER")).toBeNull();
  });
});

describe("applyViewGrant", () => {
  it("applique un refus view:false, relu par canViewModule", () => {
    const next = applyViewGrant(null, "journal", false);
    expect(next).toEqual({ view: { journal: false } });
    expect(canViewModule(next, "journal", "PLAYER")).toBe(false);
    expect(canViewModule(next, "wiki", "PLAYER")).toBe(true); // autres modules
    expect(canViewModule(next, "journal", "GM")).toBe(true); // MJ ignore les grants
  });

  it("view:true supprime la clé → accès par défaut restauré", () => {
    const denied = applyViewGrant(null, "journal", false);
    const restored = applyViewGrant(denied, "journal", true);
    expect(restored).toEqual({ view: {} });
    expect(canViewModule(restored, "journal", "PLAYER")).toBe(true);
  });

  it("conserve les autres refus et clés de permissions", () => {
    const next = applyViewGrant({ view: { ambiance: false }, extra: 1 }, "journal", false);
    expect(next).toEqual({ view: { ambiance: false, journal: false }, extra: 1 });
    expect(canViewModule(next, "ambiance", "PLAYER")).toBe(false);
    expect(canViewModule(next, "journal", "PLAYER")).toBe(false);
  });
});
