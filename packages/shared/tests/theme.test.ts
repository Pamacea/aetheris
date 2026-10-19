import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeCss, themeFileSchema } from "../src/schemas/theme.ts";

test("accepte un thème CSS simple", () => {
  const r = sanitizeCss(":root { --accent: #c03a1b; } .btn:hover { filter: brightness(1.2); }");
  assert.equal(r.ok, true);
});

test("accepte url(#) et url(data:image/…)", () => {
  const r = sanitizeCss(
    "svg { fill: url(#blur); } .x { background: url(data:image/png;base64,AA//AA==); }",
  );
  assert.equal(r.ok, true);
});

test("refuse @import", () => {
  const r = sanitizeCss('@import url("evil.css"); :root { --a: 1; }');
  assert.equal(r.ok, false);
});

test("refuse url() externe", () => {
  const r = sanitizeCss(".x { background: url(https://evil.com/x.png); }");
  assert.equal(r.ok, false);
});

test("détecte les échappements CSS (url obfusqué)", () => {
  const r = sanitizeCss(".x { background: u\\72 l(https://evil.com/x.png); }");
  assert.equal(r.ok, false);
});

test("refuse </style> même obfusqué", () => {
  const r = sanitizeCss('x { content: "\\3c /style>"; }');
  assert.equal(r.ok, false);
});

test("refuse expression(), behavior, -moz-binding", () => {
  assert.equal(sanitizeCss("x { width: expression(alert(1)); }").ok, false);
  assert.equal(sanitizeCss("x { behavior: url(x); }").ok, false);
  assert.equal(sanitizeCss("x { -moz-binding: url(x); }").ok, false);
});

test("refuse http(s):// hors url()", () => {
  const r = sanitizeCss('.x { background: image-set("https://evil.com/a.png"); }');
  assert.equal(r.ok, false);
});

test("refuse le protocol-relative résiduel", () => {
  const r = sanitizeCss('.x { background: image-set("//evil.com/a.png"); }');
  assert.equal(r.ok, false);
});

test("themeFileSchema accepte un export valide et rejette le reste", () => {
  const file = {
    format: "aetheris-theme",
    version: 1,
    name: "Ember+",
    css: ":root { --accent: #f00; }",
    js: "parent.postMessage({ type: 'aetheris:log', text: 'ok' }, '*');",
  };
  assert.equal(themeFileSchema.safeParse(file).success, true);
  assert.equal(themeFileSchema.safeParse({ ...file, format: "evil" }).success, false);
  assert.equal(themeFileSchema.safeParse({ ...file, version: 2 }).success, false);
});
