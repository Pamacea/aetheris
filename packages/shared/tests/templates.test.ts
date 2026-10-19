import { test } from "node:test";
import assert from "node:assert/strict";
// Import depuis dist/ : `node --test` ne réécrit pas les spécificateurs
// `.js` → `.ts` ; le script `test` rebuild avant de lancer les tests.
import { sanitizeFieldData, updateTemplateSchema } from "../dist/schemas/templates.js";

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
      ],
    },
  });
  assert.equal(ok.success, true);
  const ko = updateTemplateSchema.safeParse({
    schema: { fields: [{ id: "force", label: "F", kind: "number", width: "xl" }] },
  });
  assert.equal(ko.success, false);
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
