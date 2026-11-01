import assert from "node:assert/strict";
import test from "node:test";
import { evaluateGuard, isLocalHost, parseDatabaseUrl, parseEnv } from "./db-guard.mjs";

const REMOTE_URL = "postgresql://alice:s3cret@db.example.com:5432/prod?sslmode=require";
const REMOTE = { hostname: "db.example.com", database: "prod" };
const LOCAL_URL = "postgresql://u:p@127.0.0.1:5432/dev";

test("parseDatabaseUrl extrait hostname + base, sans credentials ni query", () => {
  const parsed = parseDatabaseUrl(REMOTE_URL);
  assert.deepEqual(parsed, REMOTE);
  assert.ok(!JSON.stringify(parsed).includes("s3cret"));
});

test("isLocalHost classifie les hôtes locaux", () => {
  for (const host of ["localhost", "127.0.0.1", "::1", "host.docker.internal"]) {
    assert.equal(isLocalHost(host), true, host);
  }
  assert.equal(isLocalHost("db.example.com"), false);
});

test("parseDatabaseUrl gère IPv6 et refuse une URL illisible", () => {
  assert.deepEqual(parseDatabaseUrl("postgresql://u:p@[::1]:5432/local"), {
    hostname: "::1",
    database: "local",
  });
  assert.equal(parseDatabaseUrl("not a url"), null);
  assert.equal(parseDatabaseUrl(null), null);
});

test("parseEnv lit un .env minimal", () => {
  const values = parseEnv("A=1\n# commentaire\nexport B=\"two\"\nC='three'\n");
  assert.deepEqual(values, { A: "1", B: "two", C: "three" });
});

test("un hôte local est autorisé sans confirmation", () => {
  const result = evaluateGuard({ action: "push", rawUrl: LOCAL_URL, env: {} });
  assert.equal(result.ok, true);
  assert.match(result.message, /Autorisé/);
});

test("un hôte distant exige AETHERIS_DB_CONFIRM égal au hostname", () => {
  const refused = evaluateGuard({ action: "push", rawUrl: REMOTE_URL, env: {} });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /db\.example\.com\/prod/);
  assert.match(refused.message, /AETHERIS_DB_CONFIRM=db\.example\.com/);

  const wrong = evaluateGuard({
    action: "reset",
    rawUrl: REMOTE_URL,
    env: { AETHERIS_DB_CONFIRM: "autre.example.com" },
  });
  assert.equal(wrong.ok, false);

  const confirmed = evaluateGuard({
    action: "migrate-dev",
    rawUrl: REMOTE_URL,
    env: { AETHERIS_DB_CONFIRM: "db.example.com" },
  });
  assert.equal(confirmed.ok, true);
  assert.match(confirmed.message, /Autorisé/);
});

test("--accept-data-loss est refusé même en local sans written-approval", () => {
  const refused = evaluateGuard({
    action: "push",
    rawUrl: LOCAL_URL,
    args: ["--accept-data-loss"],
    env: {},
  });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /AETHERIS_ALLOW_DATA_LOSS=written-approval/);

  const allowed = evaluateGuard({
    action: "push",
    rawUrl: LOCAL_URL,
    args: ["--accept-data-loss"],
    env: { AETHERIS_ALLOW_DATA_LOSS: "written-approval" },
  });
  assert.equal(allowed.ok, true);
});

test("--accept-data-loss reste refusé sur distant même confirmé", () => {
  const result = evaluateGuard({
    action: "push",
    rawUrl: REMOTE_URL,
    args: ["--accept-data-loss"],
    env: { AETHERIS_DB_CONFIRM: "db.example.com" },
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /AETHERIS_ALLOW_DATA_LOSS/);
});

test("URL absente ou illisible : refus", () => {
  for (const rawUrl of [null, undefined, "", "not a url"]) {
    const result = evaluateGuard({ action: "push", rawUrl, env: {} });
    assert.equal(result.ok, false);
    assert.match(result.message, /DATABASE_URL/);
  }
});

test("action inconnue : refus", () => {
  const result = evaluateGuard({ action: "drop", rawUrl: LOCAL_URL, env: {} });
  assert.equal(result.ok, false);
  assert.match(result.message, /Action inconnue/);
});
