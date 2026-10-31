/**
 * Mapping tolérant fiche ↔ token, partagé web / serveur Nest.
 *
 * Les templates personnalisés utilisent des ids et libellés libres
 * (« points de vie », « PV Maximum », « Classe d'armure »…). La résolution
 * normalise id et libellé puis retombe sur des heuristiques par mot-clé.
 */

export interface CombatValues {
  hp: number | null;
  hpMax: number | null;
  ac: number | null;
}

export interface EntityLike {
  title: string;
  data: Record<string, unknown>;
}

export interface FieldLike {
  id: string;
  label: string;
  kind: string;
}

export interface SchemaLike {
  fields: FieldLike[];
}

interface Candidate {
  key: string;
  id: string;
  label: string;
}

const HP_MAX_IDS = [
  "pvmax",
  "hpmax",
  "maxpv",
  "maxhp",
  "pointsdeviemax",
  "pointsdeviepmax",
  "maximumhp",
];
const HP_IDS = ["pv", "hp", "pointsdevie", "vitalite", "health"];
const AC_IDS = ["ca", "ac", "armure", "classedarmure", "defense", "def", "classearmure"];
const NAME_IDS = ["nom", "name", "titre"];

/** Seuls ces kinds peuvent recevoir une écriture token → fiche. */
const NUMERIC_KINDS = new Set(["number", "counter"]);
const HP_WORDS = /pv|hp|vie/;
const MAX_WORD = /max/;
const AC_WORDS = /armure|defense/;
const ATTACK_WORD = /attaque/;

/** Minuscules, diacritiques retirés, tout caractère non alphanumérique supprimé. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Number ou chaîne numérique non vide ; tout le reste → null. */
function num(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function dataCandidates(entity: EntityLike): Candidate[] {
  return Object.keys(entity.data).map((key) => {
    const id = normalize(key);
    return { key, id, label: id };
  });
}

/** Champs du schéma ; seuls les kinds numériques sont écrits (jamais une formule). */
function schemaCandidates(schema?: SchemaLike | null, numericOnly = true): Candidate[] {
  return (schema?.fields ?? [])
    .filter((field) => !numericOnly || NUMERIC_KINDS.has(field.kind))
    .map((field) => ({
      key: field.id,
      id: normalize(field.id),
      label: normalize(field.label),
    }));
}

function marked(candidate: Candidate, word: RegExp): boolean {
  return word.test(candidate.id) || word.test(candidate.label);
}

/** Exact (ids prioritaires) sur data puis schéma ; sinon heuristique data puis schéma. */
function pick(
  data: Candidate[],
  schema: Candidate[],
  exact: readonly string[],
  fuzzy: (candidate: Candidate) => boolean,
): string | null {
  for (const id of exact) {
    const found = data.find((c) => c.id === id) ?? schema.find((c) => c.id === id);
    if (found) return found.key;
  }
  return data.find(fuzzy)?.key ?? schema.find(fuzzy)?.key ?? null;
}

/**
 * Clés de `Entity.data` ciblées par les valeurs de combat.
 * `null` = aucun champ correspondant : l'appelant ne doit rien inventer.
 */
export function resolveCombatKeys(
  entity: EntityLike,
  schema?: SchemaLike | null,
): { hp: string | null; hpMax: string | null; ac: string | null } {
  const data = dataCandidates(entity);
  const fields = schemaCandidates(schema);
  return {
    hpMax: pick(data, fields, HP_MAX_IDS, (c) => marked(c, HP_WORDS) && marked(c, MAX_WORD)),
    // « PV Max » ne doit jamais servir de PV courants.
    hp: pick(data, fields, HP_IDS, (c) => marked(c, HP_WORDS) && !marked(c, MAX_WORD)),
    // « Attaque » n'est pas une armure.
    ac: pick(data, fields, AC_IDS, (c) => marked(c, AC_WORDS) && !marked(c, ATTACK_WORD)),
  };
}

/** Nom affiché : champ nom/name/titre, sinon libellé contenant « nom », sinon titre. */
export function entityName(entity: EntityLike, schema?: SchemaLike | null): string {
  const candidates = [...dataCandidates(entity), ...schemaCandidates(schema, false)];
  for (const id of NAME_IDS) {
    const found = candidates.find((c) => c.id === id);
    const value = found ? entity.data[found.key] : undefined;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const candidate of candidates) {
    if (!candidate.id.includes("nom") && !candidate.label.includes("nom")) continue;
    const value = entity.data[candidate.key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return entity.title;
}

export function entityCombatValues(entity: EntityLike, schema?: SchemaLike | null): CombatValues {
  const keys = resolveCombatKeys(entity, schema);
  return {
    hp: keys.hp ? num(entity.data[keys.hp]) : null,
    hpMax: keys.hpMax ? num(entity.data[keys.hpMax]) : null,
    ac: keys.ac ? num(entity.data[keys.ac]) : null,
  };
}

/** Patch token : seules les valeurs présentes sont reprises (pas d'écrasement). */
export function entityTokenPatch(
  entity: EntityLike,
  schema?: SchemaLike | null,
): Partial<{ name: string; hp: number; hpMax: number; ac: number }> {
  const patch: Partial<{ name: string; hp: number; hpMax: number; ac: number }> = {
    name: entityName(entity, schema),
  };
  const combat = entityCombatValues(entity, schema);
  if (combat.hp !== null) patch.hp = combat.hp;
  if (combat.hpMax !== null) patch.hpMax = combat.hpMax;
  if (combat.ac !== null) patch.ac = combat.ac;
  return patch;
}

/**
 * Valeurs token → `Entity.data` : uniquement les clés résolues (jamais de
 * `pv`/`pv_max` inventés), null omis pour ne pas écraser.
 */
export function combatEntityData(
  combat: CombatValues,
  entity: EntityLike,
  schema?: SchemaLike | null,
): Record<string, number> {
  const keys = resolveCombatKeys(entity, schema);
  const kinds = new Map((schema?.fields ?? []).map((field) => [field.id, field.kind]));
  // Clé hors schéma = champ historique (pv, ca…) ; champ non numérique ignoré.
  const writable = (key: string | null): key is string => {
    if (!key) return false;
    const kind = kinds.get(key);
    return kind === undefined || NUMERIC_KINDS.has(kind);
  };

  const data: Record<string, number> = {};
  if (combat.hp !== null && writable(keys.hp)) data[keys.hp] = combat.hp;
  if (combat.hpMax !== null && writable(keys.hpMax)) data[keys.hpMax] = combat.hpMax;
  if (combat.ac !== null && writable(keys.ac)) data[keys.ac] = combat.ac;
  return data;
}
