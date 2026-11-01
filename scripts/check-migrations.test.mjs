import { test } from "node:test";
import assert from "node:assert/strict";
import { destructiveStatements } from "./check-migrations.mjs";

const rules = (sql) => destructiveStatements(sql).map((finding) => finding.rule);

test("DROP TABLE / COLUMN / TYPE / SCHEMA et TRUNCATE sont signalés", () => {
  assert.deepEqual(rules('DROP TABLE "User";'), ["DROP TABLE"]);
  assert.deepEqual(rules('ALTER TABLE "User" DROP COLUMN "email";'), ["DROP COLUMN"]);
  assert.deepEqual(rules('DROP TYPE "Role";'), ["DROP TYPE"]);
  assert.deepEqual(rules('DROP SCHEMA "legacy";'), ["DROP SCHEMA"]);
  assert.deepEqual(rules('TRUNCATE TABLE "User";'), ["TRUNCATE"]);
});

test("DELETE FROM est signalé", () => {
  assert.deepEqual(rules('DELETE FROM "User" WHERE 1 = 1;'), ["DELETE FROM"]);
});

test("DROP CONSTRAINT / INDEX / DEFAULT ne sont pas signalés", () => {
  assert.deepEqual(rules('ALTER TABLE "User" DROP CONSTRAINT "User_role_fkey";'), []);
  assert.deepEqual(rules('DROP INDEX "User_email_idx";'), []);
  assert.deepEqual(rules('ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;'), []);
});

test("les commentaires -- sont ignorés", () => {
  assert.deepEqual(rules('-- DROP TABLE "User";\nSELECT 1;'), []);
});

test("les chaînes SQL sont ignorées", () => {
  assert.deepEqual(rules(`INSERT INTO "Log" (msg) VALUES ('DROP TABLE "User"');`), []);
});

test("SQL vide ne retourne aucun résultat", () => {
  assert.deepEqual(destructiveStatements(""), []);
  assert.deepEqual(destructiveStatements("\n\n-- rien\n"), []);
});

test("ALTER COLUMN ... TYPE et RENAME sont signalés avec leur ligne", () => {
  const sql = 'SELECT 1;\nALTER TABLE "User" ALTER COLUMN "age" SET DATA TYPE BIGINT;';
  assert.deepEqual(destructiveStatements(sql), [
    {
      line: 2,
      text: 'ALTER TABLE "User" ALTER COLUMN "age" SET DATA TYPE BIGINT;',
      rule: "ALTER COLUMN ... TYPE",
    },
  ]);
  assert.deepEqual(rules('ALTER TABLE "User" RENAME COLUMN "a" TO "b";'), ["RENAME"]);
});
