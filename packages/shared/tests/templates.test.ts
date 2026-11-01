import { test } from "node:test";
import assert from "node:assert/strict";
// Import depuis dist/ : `node --test` ne réécrit pas les spécificateurs
// `.js` → `.ts` ; le script `test` rebuild avant de lancer les tests.
import {
  LIST_FIELD_DEFAULT_ROWS,
  MAX_IMAGE_FIELD_CHARS,
  TEXTAREA_FIELD_DEFAULT_ROWS,
  cellsFree,
  fieldLayout,
  fieldSpan,
  packFields,
  sanitizeFieldData,
  templateSchemaSchema,
  updateTemplateSchema,
} from "../dist/schemas/templates.js";
import { TEMPLATE_PRESETS } from "../dist/schemas/template-presets.js";
import { SYSTEM_GENRES } from "../dist/schemas/game-systems.js";

function withRoll(roll: string) {
  return {
    schema: {
      fields: [{ id: "force", label: "Force", kind: "number", roll }],
    },
  };
}

test("updateTemplateSchema accepte une expression de jet avec macro", () => {
  const r = updateTemplateSchema.safeParse(withRoll("1d20 + @mod"));
  assert.equal(r.success, true);
});

test("updateTemplateSchema accepte un jet avec avantage (1d20 adv)", () => {
  const r = updateTemplateSchema.safeParse(withRoll("1d20 adv"));
  assert.equal(r.success, true);
});

test("updateTemplateSchema refuse une expression de jet invalide", () => {
  const r = updateTemplateSchema.safeParse(withRoll("pas des des"));
  assert.equal(r.success, false);
  if (!r.success) {
    const issue = r.error.issues.find((i) => i.path.join(".") === "schema.fields.0.roll");
    assert.ok(issue, "issue attendue sur schema.fields.0.roll");
    assert.match(issue.message, /Expression de jet invalide/);
  }
});

test("updateTemplateSchema sans schema (ou sans roll) : pas de vérification de jet", () => {
  assert.equal(updateTemplateSchema.safeParse({}).success, true);
  assert.equal(
    updateTemplateSchema.safeParse({
      schema: { fields: [{ id: "pv", label: "PV", kind: "counter" }] },
    }).success,
    true,
  );
});

const schema = {
  fields: [{ id: "force", label: "Force", kind: "number" as const }],
};
const macroBlock = {
  id: "b1",
  kind: "macro" as const,
  label: "PV",
  value: "",
  expr: "force + 5",
};

test("sanitizeFieldData préserve les blocs valides", () => {
  const out = sanitizeFieldData(schema, { force: 10, blocks: [macroBlock] });
  assert.equal(out.force, 10);
  assert.deepEqual(out.blocks, [macroBlock]);
});

test("sanitizeFieldData purge les blocs invalides (kind inconnu)", () => {
  const out = sanitizeFieldData(schema, {
    force: 10,
    blocks: [{ ...macroBlock, kind: "inconnu" }],
  });
  assert.equal("blocks" in out, false);
});

// --- Phase 14 : width/size, maxLength, select enrichi, multiSelect, list ---

test("width/size acceptés sur tout kind, valeur hors enum refusée", () => {
  const ok = updateTemplateSchema.safeParse({
    schema: {
      fields: [
        { id: "force", label: "Force", kind: "number", width: "sm", size: "sm" },
        { id: "nom", label: "Nom", kind: "text", width: "full", size: "md" },
        { id: "rang", label: "Rang", kind: "text", width: "1/3" },
      ],
    },
  });
  assert.equal(ok.success, true);
  const ko = updateTemplateSchema.safeParse({
    schema: { fields: [{ id: "force", label: "F", kind: "number", width: "xl" }] },
  });
  assert.equal(ko.success, false);
});

test("span/minHeight acceptés, bornes refusées", () => {
  const ok = updateTemplateSchema.safeParse({
    schema: { fields: [{ id: "t", label: "T", kind: "text", span: 5, minHeight: 120 }] },
  });
  assert.equal(ok.success, true);
  for (const bad of [{ span: 0 }, { span: 13 }, { minHeight: 47 }]) {
    const ko = updateTemplateSchema.safeParse({
      schema: { fields: [{ id: "t", label: "T", kind: "text", ...bad }] },
    });
    assert.equal(ko.success, false, `rejet attendu pour ${JSON.stringify(bad)}`);
  }
});

test("fieldSpan : span prime sur width, sinon largeur historique/défaut", () => {
  assert.equal(fieldSpan({ span: 5, width: "full", kind: "text" }), 5);
  assert.equal(fieldSpan({ width: "full", kind: "text" }), 12);
  assert.equal(fieldSpan({ kind: "number" }), 3);
});

test("fieldLayout : défauts legacy et clamp des bornes", () => {
  assert.deepEqual(fieldLayout({}), { x: 0, y: 0, w: 2, h: 2 });
  assert.deepEqual(fieldLayout({ span: 5, minHeight: 120 }), { x: 0, y: 0, w: 5, h: 2 });
  assert.deepEqual(fieldLayout({ span: 1 }), { x: 0, y: 0, w: 1, h: 2 });
  assert.deepEqual(fieldLayout({ layout: { x: -3, y: -1, w: 99, h: 500 } }), {
    x: 0,
    y: 0,
    w: 12,
    h: 199,
  });
  assert.deepEqual(fieldLayout({ layout: { x: 11, y: 250, w: 4, h: 1 } }), {
    x: 8,
    y: 197,
    w: 4,
    h: 2,
  });
  // Largeur minimale 1 conservée ; x borné à 12 - w.
  assert.deepEqual(fieldLayout({ layout: { x: 11, y: 0, w: 1, h: 2 } }), {
    x: 11,
    y: 0,
    w: 1,
    h: 2,
  });
});

test("updateTemplateSchema : customCss optionnel, borné, effaçable", () => {
  assert.equal(updateTemplateSchema.safeParse({ customCss: ".x { color: red; }" }).success, true);
  assert.equal(updateTemplateSchema.safeParse({ customCss: null }).success, true);
  assert.equal(updateTemplateSchema.safeParse({ customCss: "a".repeat(20_001) }).success, false);
  // Absent = champ non touché (l'autosave du builder n'écrase pas le style).
  const parsed = updateTemplateSchema.parse({ name: "Gobelin" });
  assert.equal("customCss" in parsed, false);
});

test("fieldLayout : taille par défaut selon le type", () => {
  for (const kind of ["list", "ability", "inventory"] as const) {
    assert.deepEqual(fieldLayout({ kind }), { x: 0, y: 0, w: 5, h: LIST_FIELD_DEFAULT_ROWS });
  }
  for (const kind of ["number", "counter"] as const) {
    assert.deepEqual(fieldLayout({ kind }), { x: 0, y: 0, w: 1, h: 3 });
  }
  assert.equal(fieldLayout({ kind: "text" }).h, 2);
  assert.equal(fieldLayout({ kind: "textarea" }).h, TEXTAREA_FIELD_DEFAULT_ROWS);
  // Un layout explicite reste prioritaire : aucun reflow des modèles existants.
  assert.equal(fieldLayout({ kind: "list", layout: { x: 0, y: 0, w: 4, h: 4 } }).h, 4);
});

test("TEMPLATE_PRESETS : ids uniques, schémas valides, genres connus", () => {
  const ids = TEMPLATE_PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "ids de presets dupliqués");
  for (const p of TEMPLATE_PRESETS) {
    const r = templateSchemaSchema.safeParse(p.schema);
    assert.equal(r.success, true, `${p.id} : ${r.success ? "" : r.error.issues[0]?.message}`);
    if (p.genre) {
      assert.ok(
        SYSTEM_GENRES.some((g) => g.id === p.genre),
        `${p.id} : genre inconnu ${p.genre}`,
      );
    }
  }
});

test("TEMPLATE_PRESETS : aucun champ css résiduel (style porté par customCss)", () => {
  for (const p of TEMPLATE_PRESETS) {
    assert.equal(
      p.schema.fields.some((f) => f.kind === "css"),
      false,
      `${p.id} contient encore un champ css`,
    );
  }
});

test("packFields : attribue des layouts sans chevauchement", () => {
  const packed = packFields([
    { id: "a", label: "A", kind: "text" },
    { id: "b", label: "B", kind: "number" },
    { id: "c", label: "C", kind: "textarea" },
  ]);
  assert.deepEqual(
    packed.map((f) => f.layout),
    [
      { x: 0, y: 0, w: 2, h: 2 },
      // Nombre : bandeau étroit 1×3.
      { x: 2, y: 0, w: 1, h: 3 },
      // Texte long : hauteur par défaut plus grande (libellé + zone).
      { x: 3, y: 0, w: 2, h: TEXTAREA_FIELD_DEFAULT_ROWS },
    ],
  );
  for (let i = 0; i < packed.length; i++) {
    const l = packed[i].layout;
    assert.equal(cellsFree(packed, l.x, l.y, l.w, l.h, i), true);
  }
});

test("packFields : respecte un layout existant", () => {
  const packed = packFields([
    { id: "a", label: "A", kind: "text", layout: { x: 0, y: 0, w: 6, h: 4 } },
    { id: "b", label: "B", kind: "text", span: 6 },
  ]);
  assert.deepEqual(packed[1].layout, { x: 6, y: 0, w: 6, h: 2 });
});

test("cellsFree : collision rectangle et index ignoré", () => {
  const fields = [{ id: "a", label: "A", kind: "text", layout: { x: 0, y: 0, w: 6, h: 4 } }];
  assert.equal(cellsFree(fields, 0, 0, 6, 4, -1), false);
  assert.equal(cellsFree(fields, 6, 0, 6, 4, -1), true);
  assert.equal(cellsFree(fields, 0, 0, 6, 4, 0), true);
});

test("ancien payload select (sans source/free) toujours valide", () => {
  const r = updateTemplateSchema.safeParse({
    schema: {
      fields: [
        {
          id: "align",
          label: "Alignement",
          kind: "select",
          options: [{ value: "ln", label: "Loyal neutre" }],
        },
      ],
    },
  });
  assert.equal(r.success, true);
});

test("superRefine : options vides refusées sauf source wiki", () => {
  const ko = updateTemplateSchema.safeParse({
    schema: { fields: [{ id: "o", label: "O", kind: "select", options: [] }] },
  });
  assert.equal(ko.success, false);
  if (!ko.success) {
    const issue = ko.error.issues.find((i) => i.path.join(".") === "schema.fields.0.options");
    assert.ok(issue, "issue attendue sur schema.fields.0.options");
  }
  const ok = updateTemplateSchema.safeParse({
    schema: {
      fields: [{ id: "o", label: "O", kind: "select", options: [], source: "wiki" }],
    },
  });
  assert.equal(ok.success, true);
});

test("sanitizeFieldData select : free/wiki ouvre, statique filtre", () => {
  const freeSchema = {
    fields: [
      {
        id: "o",
        label: "O",
        kind: "select" as const,
        options: [{ value: "a", label: "A" }],
        free: true,
      },
    ],
  };
  assert.equal(sanitizeFieldData(freeSchema, { o: "ma-valeur" }).o, "ma-valeur");
  const wikiSchema = {
    fields: [
      { id: "o", label: "O", kind: "select" as const, options: [], source: "wiki" as const },
    ],
  };
  assert.equal(sanitizeFieldData(wikiSchema, { o: "Héroïne" }).o, "Héroïne");
  const staticSchema = {
    fields: [
      { id: "o", label: "O", kind: "select" as const, options: [{ value: "a", label: "A" }] },
    ],
  };
  assert.equal(sanitizeFieldData(staticSchema, { o: "hors-liste" }).o, null);
});

test("sanitizeFieldData multiSelect : filtre, cap 50, non-tableau → défaut", () => {
  const multiSchema = {
    fields: [
      {
        id: "spells",
        label: "Sorts",
        kind: "multiSelect" as const,
        options: [
          { value: "feu", label: "Feu" },
          { value: "givre", label: "Givre" },
        ],
        default: ["feu"],
      },
    ],
  };
  assert.deepEqual(
    sanitizeFieldData(multiSchema, { spells: ["feu", "givre", "hors", "feu"] }).spells,
    ["feu", "givre"],
  );
  assert.deepEqual(sanitizeFieldData(multiSchema, { spells: "pas-un-tableau" }).spells, ["feu"]);
  const many = Array.from({ length: 60 }, (_, i) => `v${i}`);
  const capSchema = {
    fields: [
      { id: "s", label: "S", kind: "multiSelect" as const, options: [], source: "wiki" as const },
    ],
  };
  assert.equal((sanitizeFieldData(capSchema, { s: many }).s as string[]).length, 50);
});

test("sanitizeFieldData tag multiple : trim, dédup, non-chaînes filtrées, cap 50", () => {
  const multiTag = {
    fields: [{ id: "lie", label: "Lié à", kind: "tag" as const, multiple: true }],
  };
  assert.deepEqual(sanitizeFieldData(multiTag, { lie: [" a ", "b", "a", 3, "", "b"] }).lie, [
    "a",
    "b",
  ]);
  const many = Array.from({ length: 60 }, (_, i) => `n${i}`);
  assert.equal((sanitizeFieldData(multiTag, { lie: many }).lie as string[]).length, 50);
  assert.deepEqual(sanitizeFieldData(multiTag, { lie: "pas-un-tableau" }).lie, []);
  assert.deepEqual(sanitizeFieldData(multiTag, { lie: ["x".repeat(100)] }).lie, ["x".repeat(80)]);
});

test("sanitizeFieldData tag simple : un tableau résiduel devient null", () => {
  const simple = { fields: [{ id: "lie", label: "Lié à", kind: "tag" as const }] };
  assert.equal(sanitizeFieldData(simple, { lie: ["a"] }).lie, null);
  assert.equal(sanitizeFieldData(simple, { lie: "a" }).lie, "a");
});

test("image : data URI longue acceptée (défaut) et non tronquée à 500 caractères", () => {
  const long = `data:image/png;base64,${"A".repeat(1_000_000)}`;
  const parsed = templateSchemaSchema.safeParse({
    fields: [{ id: "illu", label: "Illustration", kind: "image", default: long }],
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(sanitizeFieldData(parsed.data, { illu: long }).illu, long);
  assert.equal(
    (
      sanitizeFieldData(parsed.data, { illu: "A".repeat(MAX_IMAGE_FIELD_CHARS + 10) })
        .illu as string
    ).length,
    MAX_IMAGE_FIELD_CHARS,
  );
});

test("sanitizeFieldData text : maxLength appliquée, défaut 5000 sinon", () => {
  const short = { fields: [{ id: "t", label: "T", kind: "text" as const, maxLength: 5 }] };
  assert.equal(sanitizeFieldData(short, { t: "abcdefgh" }).t, "abcde");
  const legacy = { fields: [{ id: "t", label: "T", kind: "text" as const }] };
  const long = "x".repeat(6_000);
  assert.equal((sanitizeFieldData(legacy, { t: long }).t as string).length, 5_000);
});

const listSchema = {
  fields: [
    {
      id: "inventaire",
      label: "Inventaire",
      kind: "list" as const,
      columns: [
        { id: "nom", label: "Nom", type: "text" as const },
        { id: "poids", label: "Poids", type: "number" as const },
      ],
    },
  ],
};

test("sanitizeFieldData list : colonnes inconnues ignorées, number non fini omis, cap 100, non-tableau → []", () => {
  assert.deepEqual(sanitizeFieldData(listSchema, { inventaire: "non-tableau" }).inventaire, []);
  const rows = [
    { nom: "Épée", poids: 2, inconnu: "x" },
    { nom: "Arc", poids: "pas-un-nombre" },
  ];
  assert.deepEqual(sanitizeFieldData(listSchema, { inventaire: rows }).inventaire, [
    { nom: "Épée", poids: 2 },
    { nom: "Arc" },
  ]);
  const many = Array.from({ length: 150 }, () => ({ nom: "x", poids: 1 }));
  assert.equal(
    (sanitizeFieldData(listSchema, { inventaire: many }).inventaire as unknown[]).length,
    100,
  );
});

test('superRefine list : colonnes dupliquées, id "n", collision d\'agrégat refusés', () => {
  const dup = {
    schema: {
      fields: [
        {
          id: "inv",
          label: "Inv",
          kind: "list",
          columns: [
            { id: "col", label: "A", type: "text" },
            { id: "col", label: "B", type: "text" },
          ],
        },
      ],
    },
  };
  assert.equal(updateTemplateSchema.safeParse(dup).success, false);
  const reserved = {
    schema: {
      fields: [
        { id: "inv", label: "Inv", kind: "list", columns: [{ id: "n", label: "N", type: "text" }] },
      ],
    },
  };
  assert.equal(updateTemplateSchema.safeParse(reserved).success, false);
  // Un champ `inv_poids` existe déjà → l'agrégat de la colonne poids entre en collision.
  const collide = {
    schema: {
      fields: [
        { id: "inv_poids", label: "Poids total", kind: "number" },
        {
          id: "inv",
          label: "Inv",
          kind: "list",
          columns: [{ id: "poids", label: "Poids", type: "number" }],
        },
      ],
    },
  };
  const r = updateTemplateSchema.safeParse(collide);
  assert.equal(r.success, false);
  if (!r.success) {
    assert.ok(
      r.error.issues.some((i) => i.message.includes("inv_poids")),
      "message de collision attendu",
    );
  }
});
