import { describe, expect, it } from "vitest";
import { canViewModule } from "./grants";

describe("canViewModule", () => {
  it("le MJ voit toujours tout", () => {
    expect(canViewModule({ view: { journal: false } }, "journal", "GM")).toBe(true);
    expect(canViewModule(null, "journal", "GM")).toBe(true);
  });

  it("joueur sans grant : accès par défaut", () => {
    expect(canViewModule(null, "journal", "PLAYER")).toBe(true);
    expect(canViewModule({}, "journal", "PLAYER")).toBe(true);
    expect(canViewModule({ view: {} }, "journal", "PLAYER")).toBe(true);
  });

  it("joueur : refus persisté bloque, les autres modules passent", () => {
    const permissions = { view: { journal: false } };
    expect(canViewModule(permissions, "journal", "PLAYER")).toBe(false);
    expect(canViewModule(permissions, "ambiance", "PLAYER")).toBe(true);
  });
});
