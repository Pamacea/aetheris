import { describe, expect, it } from "vitest";
import { safeHref } from "./tiptap-content";

describe("safeHref (allowlist des liens publics)", () => {
  it("accepte les URL http(s) et mailto", () => {
    expect(safeHref("https://example.org")).toBe("https://example.org");
    expect(safeHref("http://x")).toBe("http://x");
    expect(safeHref("mailto:a@b.c")).toBe("mailto:a@b.c");
  });

  it("accepte les références relatives", () => {
    expect(safeHref("/chemin")).toBe("/chemin");
    expect(safeHref("#ancre")).toBe("#ancre");
    expect(safeHref("?q=1")).toBe("?q=1");
  });

  it("rejette les schémas dangereux et les valeurs non textuelles", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("vbscript:x")).toBeNull();
    expect(safeHref(null)).toBeNull();
    expect(safeHref(42)).toBeNull();
    expect(safeHref("")).toBeNull();
  });
});
