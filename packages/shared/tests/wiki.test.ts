import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWikiNoteSchema,
  noteBlockSchema,
  noteBlocksSchema,
  saveWikiNoteSchema,
  wikiFolderSchema,
  wikiTitleSchema,
} from "../dist/schemas/wiki.js";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

function bloc(over: Record<string, unknown> = {}) {
  return { id: "b1", kind: "macro", label: "PV", value: "12", ...over };
}

test("titre : trim, exigé, borné à 200", () => {
  const r = wikiTitleSchema.safeParse("  Mon titre  ");
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data, "Mon titre");
  assert.equal(wikiTitleSchema.safeParse("").success, false);
  assert.equal(wikiTitleSchema.safeParse("   ").success, false);
  assert.equal(wikiTitleSchema.safeParse("x".repeat(200)).success, true);
  assert.equal(wikiTitleSchema.safeParse("x".repeat(201)).success, false);
});

test("dossier : borné à 120 après trim", () => {
  assert.equal(wikiFolderSchema.safeParse("Royaumes/Nord").success, true);
  assert.equal(wikiFolderSchema.safeParse("x".repeat(121)).success, false);
  assert.equal(wikiFolderSchema.safeParse(" ").success, false);
});

test("création de note : titre requis, templateId UUID si présent", () => {
  assert.equal(createWikiNoteSchema.safeParse({ title: "Nouvelle" }).success, true);
  assert.equal(
    createWikiNoteSchema.safeParse({ title: "Nouvelle", templateId: UUID }).success,
    true,
  );
  assert.equal(createWikiNoteSchema.safeParse({}).success, false);
  assert.equal(
    createWikiNoteSchema.safeParse({ title: "N", templateId: "pas-un-uuid" }).success,
    false,
  );
});

test("sauvegarde : contentHtml exigé et borné à 500 Ko", () => {
  assert.equal(saveWikiNoteSchema.safeParse({ contentHtml: "<p>ok</p>" }).success, true);
  assert.equal(saveWikiNoteSchema.safeParse({ contentHtml: "x".repeat(500_000) }).success, true);
  assert.equal(saveWikiNoteSchema.safeParse({ contentHtml: "x".repeat(500_001) }).success, false);
  assert.equal(saveWikiNoteSchema.safeParse({}).success, false);
});

test("bloc : kind inconnu ou champs hors bornes refusés", () => {
  assert.equal(noteBlockSchema.safeParse(bloc()).success, true);
  assert.equal(noteBlockSchema.safeParse(bloc({ kind: "preset" })).success, false);
  assert.equal(noteBlockSchema.safeParse(bloc({ label: "" })).success, false);
  assert.equal(noteBlockSchema.safeParse(bloc({ label: "x".repeat(81) })).success, false);
  assert.equal(noteBlockSchema.safeParse(bloc({ value: "x".repeat(301) })).success, false);
  assert.equal(noteBlockSchema.safeParse(bloc({ id: "" })).success, false);
});

test("bloc macro : expr/roll bornés, refNoteId UUID, gm optionnel", () => {
  assert.equal(noteBlockSchema.safeParse(bloc({ expr: "force + 5" })).success, true);
  assert.equal(noteBlockSchema.safeParse(bloc({ expr: "x".repeat(201) })).success, false);
  assert.equal(noteBlockSchema.safeParse(bloc({ roll: "x".repeat(101) })).success, false);
  assert.equal(noteBlockSchema.safeParse(bloc({ refNoteId: UUID, gm: true })).success, true);
  assert.equal(noteBlockSchema.safeParse(bloc({ refNoteId: "nawak" })).success, false);
});

test("bloc : size optionnel sm/md/lg, valeur hors énum refusée", () => {
  assert.equal(noteBlockSchema.safeParse(bloc()).success, true);
  assert.equal(noteBlockSchema.safeParse(bloc({ size: "sm" })).success, true);
  assert.equal(noteBlockSchema.safeParse(bloc({ size: "lg" })).success, true);
  assert.equal(noteBlockSchema.safeParse(bloc({ size: "xl" })).success, false);
});

test("liste de blocs : 50 max", () => {
  const cinquante = Array.from({ length: 50 }, (_, i) => bloc({ id: `b${i}` }));
  assert.equal(noteBlocksSchema.safeParse(cinquante).success, true);
  assert.equal(noteBlocksSchema.safeParse([...cinquante, bloc({ id: "b50" })]).success, false);
});
