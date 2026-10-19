import { describe, expect, it } from "vitest";
import { macrosKey, parseMacros, removeMacro, upsertMacro, type Macro } from "./macro-storage";

const a: Macro = { id: "1", name: "Attaque", source: 'return "/roll 1d20";' };
const b: Macro = { id: "2", name: "Soins", source: 'return "Soins";' };

describe("macrosKey", () => {
  it("isole la clé par campagne", () => {
    expect(macrosKey("abc")).toBe("aetheris:macros:abc");
    expect(macrosKey("abc")).not.toBe(macrosKey("def"));
  });
});

describe("parseMacros", () => {
  it("lit une liste valide", () => {
    expect(parseMacros(JSON.stringify([a, b]))).toEqual([a, b]);
  });

  it("ignore les entrées malformées sans jeter le reste", () => {
    const raw = JSON.stringify([a, { id: 2, name: "x", source: "y" }, null, "nope", b]);
    expect(parseMacros(raw)).toEqual([a, b]);
  });

  it("revient à une liste vide sur JSON cassé ou tableau absent", () => {
    expect(parseMacros("{oops")).toEqual([]);
    expect(parseMacros('{"id":"1"}')).toEqual([]);
    expect(parseMacros("")).toEqual([]);
  });
});

describe("upsertMacro / removeMacro", () => {
  it("ajoute puis remplace par id", () => {
    const added = upsertMacro([a], b);
    expect(added).toEqual([a, b]);
    const updated = upsertMacro(added, { ...b, name: "Soins majeurs" });
    expect(updated).toHaveLength(2);
    expect(updated[1].name).toBe("Soins majeurs");
  });

  it("supprime par id et laisse les autres intacts", () => {
    expect(removeMacro([a, b], "1")).toEqual([b]);
    expect(removeMacro([a, b], "inconnu")).toEqual([a, b]);
  });
});
