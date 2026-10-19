import { describe, expect, it } from "vitest";
import { sanitizeWikiHtml } from "./sanitize-wiki";

describe("sanitizeWikiHtml", () => {
  it("retire script, styles et handlers d'événements", () => {
    expect(sanitizeWikiHtml("<p>ok</p><script>alert(1)</script>")).toBe("<p>ok</p>");
    expect(sanitizeWikiHtml('<p onclick="steal()">ok</p>')).toBe("<p>ok</p>");
    expect(sanitizeWikiHtml("<img src=x onerror=alert(1)>")).toBe("");
  });

  it("refuse les URL de schéma dangereux", () => {
    expect(sanitizeWikiHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
    expect(sanitizeWikiHtml('<a href="https://aetheris.dev">x</a>')).toContain(
      'href="https://aetheris.dev"',
    );
  });

  it("préserve les nœuds wiki (gm-secret, aetheris-block, wikilink)", () => {
    const html =
      "<gm-secret><p>secret</p></gm-secret>" +
      '<aetheris-block data-kind="roll" data-label="PV" data-value="1d20" data-size="lg"></aetheris-block>' +
      '<a class="wiki-link" href="#" data-wiki-link="Héroïne" title="Héroïne">lien</a>';
    const clean = sanitizeWikiHtml(html);
    expect(clean).toContain("<gm-secret><p>secret</p></gm-secret>");
    expect(clean).toContain('data-kind="roll"');
    expect(clean).toContain('data-label="PV"');
    expect(clean).toContain('data-size="lg"');
    expect(clean).toContain('data-wiki-link="Héroïne"');
    expect(clean).toContain('class="wiki-link"');
  });
});
