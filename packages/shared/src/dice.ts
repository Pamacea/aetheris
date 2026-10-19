/**
 * Moteur de dés déterministe (Phase 6 — partagé client/serveur).
 *
 * Le serveur tire avec une seed crypto → broadcast : tous les clients
 * affichent exactement le même résultat (anti-cheat + synchro).
 *
 * Expressions supportées :
 *   "2d6+3", "d20", "1d20 adv" / "avantage", "1d20 dis" / "désavantage",
 *   "4d6kh3" (keep highest), "2d8+1d6-1", macros "@force" (à substituer
 *   avant le parse via `substituteMacros`).
 */

export interface RollTerm {
  count: number;
  sides: number;
  /** Garder les N plus hauts (kh) — ex. 4d6kh3. */
  keepHighest?: number;
  /** Garder les N plus bas (kl). */
  keepLowest?: number;
  /** Avantage/désavantage : 2 tirages, on garde le meilleur/le pire. */
  mode?: "adv" | "dis";
}

export interface ParsedRoll {
  terms: RollTerm[];
  /** Somme des constantes additives (ex. "+3" → 3). */
  constants: number;
  /** Expression normalisée (replay dans le chat). */
  label: string;
}

export interface RollOutcome {
  /** Valeurs finales de chaque terme (après keep / avantage). */
  results: number[];
  /** Total = somme(results) + constants. */
  total: number;
}

export class DiceError extends Error {}

// ── RNG déterministe (mulberry32) ────────────────────────────────────
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed non prédictible côté serveur. */
export function randomSeed(): number {
  const [seed] = crypto.getRandomValues(new Uint32Array(1));
  return seed ?? 0;
}

// ── Parsing ──────────────────────────────────────────────────────────
const TERM_RE = /([+-]?)\s*(?:(\d*)d(\d+)(?:(kh|kl)(\d+))?|(\d+))/gi;
const MACRO_RE = /@([a-z0-9_\-]+)/gi;
const ADV_WORDS = new Set(["adv", "avantage", "edge"]);
const DIS_WORDS = new Set(["dis", "désavantage", "desavantage", "disadv"]);

/**
 * Analyse une expression de dés. Lance `DiceError` (message FR) si
 * l'expression est invalide.
 */
export function parseRollExpression(input: string): ParsedRoll {
  const raw = input.trim();
  if (!raw) throw new DiceError("Expression vide");

  // Suffixe avantage/désavantage (mots isolés, fin d'expression).
  let mode: "adv" | "dis" | undefined;
  let body = raw;
  const words = raw.split(/\s+/);
  const last = words[words.length - 1]?.toLowerCase() ?? "";
  if (ADV_WORDS.has(last)) {
    mode = "adv";
    body = words.slice(0, -1).join(" ");
  } else if (DIS_WORDS.has(last)) {
    mode = "dis";
    body = words.slice(0, -1).join(" ");
  }

  const terms: RollTerm[] = [];
  let constants = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(TERM_RE.source, "gi");

  while ((match = re.exec(body)) !== null) {
    const sign = match[1] === "-" ? -1 : 1;
    if (match[3] !== undefined) {
      // Terme de dés : NdM[khN|klN]
      const count = match[2] === "" || match[2] === undefined ? 1 : Number(match[2]);
      const sides = Number(match[3]);
      if (count < 1 || count > 100) throw new DiceError("Nombre de dés hors limite (1–100)");
      if (sides < 2 || sides > 1000) throw new DiceError("Faces du dé hors limite (2–1000)");
      if (sign < 0) throw new DiceError("Un dé ne peut pas être négatif");
      const term: RollTerm = { count, sides };
      if (match[4] === "kh") term.keepHighest = Number(match[5]);
      if (match[4] === "kl") term.keepLowest = Number(match[5]);
      if (mode) {
        if (count !== 1) throw new DiceError("Avantage/désavantage : un seul dé (ex. 1d20 adv)");
        term.mode = mode;
      }
      terms.push(term);
    } else if (match[6] !== undefined) {
      // Constante
      constants += sign * Number(match[6]);
    }
  }

  // Tout le corps doit être consommé (hors espaces).
  const stripped = body.replace(TERM_RE, "").replace(/\s+/g, "");
  if (stripped !== "") {
    throw new DiceError(`Expression invalide : « ${input} »`);
  }
  if (terms.length === 0 && constants === 0) {
    throw new DiceError("Aucun dé dans l'expression");
  }

  return { terms, constants, label: raw };
}

/** Remplace les macros `@stat` par leurs valeurs (inconnue → DiceError). */
export function substituteMacros(input: string, stats: Record<string, number>): string {
  const out = input.replace(MACRO_RE, (whole, name: string) => {
    const key = name.toLowerCase();
    const value = stats[key];
    if (value === undefined) {
      throw new DiceError(`Macro inconnue : ${whole}`);
    }
    return String(value);
  });
  // Un négatif substitué après `+` casse le parse (+ -2 → `+` orphelin).
  return out
    .replace(/\+\s*-\s*/g, "- ")
    .replace(/-\s*-\s*/g, "+ ")
    .replace(/-\s*\+\s*/g, "- ");
}

// ── Exécution ────────────────────────────────────────────────────────
/** Exécute un jet avec une seed → résultat déterministe. */
export function executeRoll(parsed: ParsedRoll, seed: number): RollOutcome {
  const rng = makeRng(seed);
  const results: number[] = [];

  for (const term of parsed.terms) {
    if (term.mode) {
      // Avantage : 2 tirages, on garde le meilleur (dis : le pire).
      const a = 1 + Math.floor(rng() * term.sides);
      const b = 1 + Math.floor(rng() * term.sides);
      results.push(term.mode === "adv" ? Math.max(a, b) : Math.min(a, b));
      continue;
    }
    const rolls: number[] = [];
    for (let i = 0; i < term.count; i++) {
      rolls.push(1 + Math.floor(rng() * term.sides));
    }
    if (term.keepHighest !== undefined || term.keepLowest !== undefined) {
      const sorted = [...rolls].sort((x, y) => y - x); // décroissant
      const kh = term.keepHighest;
      const kl = term.keepLowest;
      const n = kh !== undefined ? kh : (kl ?? rolls.length);
      const kept = kh !== undefined ? sorted.slice(0, n) : [...sorted].reverse().slice(0, n); // plus bas
      results.push(kept.reduce((s, v) => s + v, 0));
    } else {
      results.push(rolls.reduce((s, v) => s + v, 0));
    }
  }

  const total = results.reduce((s, v) => s + v, 0) + parsed.constants;
  return { results, total };
}

/** Raccourci : parse + exécute. */
export function roll(input: string, seed: number): RollOutcome & { label: string } {
  const parsed = parseRollExpression(input);
  const out = executeRoll(parsed, seed);
  return { ...out, label: parsed.label };
}
