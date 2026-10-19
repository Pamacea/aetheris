import { describe, expect, it } from "vitest";
import { sanitizeWikiHtml } from "@/lib/sanitize-wiki";
import { stripGmSecrets } from "@/lib/wiki";
import { blocksToReadableHtml } from "./readable";

/** Pipeline exact de la route publique `/shared/[slug]`. */
function shareHtml(raw: string): string {
  return blocksToReadableHtml(sanitizeWikiHtml(stripGmSecrets(raw)));
}

describe("partage public du wiki", () => {
  it("retire les secrets MJ et le HTML dangereux", () => {
    const raw =
      "<p>Public</p><gm-secret><p>complot du MJ</p></gm-secret>" +
      '<script>alert(1)</script><p onclick="steal()">ok</p>';
    const out = shareHtml(raw);
    expect(out).toContain("Public");
    expect(out).not.toContain("complot du MJ");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("alert(1)");
  });

  it("rend les blocs atomiques lisibles (label/valeur, jet)", () => {
    const raw =
      '<aetheris-block data-kind="custom" data-label="PV" data-value="12 / 20"></aetheris-block>' +
      '<dice-block data-label="Initiative" data-expr="1d20+3"></dice-block>';
    const out = shareHtml(raw);
    expect(out).toContain("<strong>PV</strong> : 12 / 20");
    expect(out).toContain("<strong>Initiative</strong>");
    expect(out).toContain("1d20+3");
    expect(out).not.toContain("<dice-block");
  });

  it("déplie un tableau même après échappement des attributs", () => {
    const rows = JSON.stringify([
      ["Nom", "Valeur"],
      ["Brûlor", "3"],
    ]);
    const raw = `<wiki-table data-rows='${rows}'></wiki-table>`;
    const out = shareHtml(raw);
    expect(out).toContain("<th>Nom</th>");
    expect(out).toContain("<td>Brûlor</td>");
    expect(out).not.toContain("<wiki-table");
  });

  it("échappe le texte injecté dans les blocs", () => {
    const raw =
      '<aetheris-block data-label="<img src=x onerror=alert(1)>" data-value="&lt;b&gt;x&lt;/b&gt;"></aetheris-block>';
    const out = shareHtml(raw);
    expect(out).not.toContain("<img");
    expect(out).not.toContain("<b>");
  });
});
