/**
 * Évaluateur d'expressions arithmétiques pour les champs « formule ».
 *
 * Implémentation maison ( descente récursive ) : aucun eval/Function,
 * donc pas d'injection de code depuis le schéma d'un template.
 *
 * Grammaire :
 *   expr    := term (("+" | "-") term)*
 *   term    := factor (("*" | "/" | "%") factor)*
 *   factor  := unary ("^" factor)?          // associatif à droite
 *   unary   := ("-" | "+") unary | primary
 *   primary := number | ident | call | "(" expr ")"
 *   call    := ident "(" expr ("," expr)* ")"
 *
 * Les identifiants référencent les ids de champs (force, pv, @force…)
 * et les valeurs non numériques comptent comme 0.
 */

import { ABILITY_MODIFIER_COLUMNS, INVENTORY_MODIFIER_COLUMNS } from "./schemas/templates.js";

interface Token {
  kind: "num" | "ident" | "op" | "paren" | "comma";
  value: string;
}

const FUNCS: Record<string, (...args: number[]) => number> = {
  min: (...a) => Math.min(...a),
  max: (...a) => Math.max(...a),
  round: (x) => Math.round(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  abs: (x) => Math.abs(x),
  sqrt: (x) => Math.sqrt(x),
  pow: (x, y) => Math.pow(x, y),
};

function tokenize(src: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src.charAt(i);
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src.charAt(j))) j++;
      const raw = src.slice(i, j);
      if (!/^\d+(\.\d+)?$/.test(raw)) return null;
      tokens.push({ kind: "num", value: raw });
      i = j;
      continue;
    }
    if (/[a-zA-Z_@]/.test(c)) {
      let j = i;
      if (src.charAt(j) === "@") j++; // macro @force : le @ préfixe l'identifiant
      const start = j;
      while (j < src.length && /[a-zA-Z0-9_.-]/.test(src.charAt(j))) j++;
      if (j === start) return null; // "@" sans nom d'identifiant
      tokens.push({ kind: "ident", value: src.slice(i, j).replace(/^@/, "") });
      i = j;
      continue;
    }
    if ("+-*/%^".includes(c)) {
      tokens.push({ kind: "op", value: c });
      i++;
      continue;
    }
    if (c === "(" || c === ")") {
      tokens.push({ kind: "paren", value: c });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ kind: "comma", value: c });
      i++;
      continue;
    }
    return null;
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly lookup: (name: string) => number | null,
  ) {}

  parse(): number | null {
    if (this.tokens.length === 0) return null;
    const v = this.expr();
    if (v === null || this.pos !== this.tokens.length) return null;
    return v;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private expr(): number | null {
    let left = this.term();
    if (left === null) return null;
    for (;;) {
      const t = this.peek();
      if (t?.kind === "op" && (t.value === "+" || t.value === "-")) {
        this.pos++;
        const right = this.term();
        if (right === null) return null;
        left = t.value === "+" ? left + right : left - right;
      } else break;
    }
    return left;
  }

  private term(): number | null {
    let left = this.factor();
    if (left === null) return null;
    for (;;) {
      const t = this.peek();
      if (t?.kind === "op" && (t.value === "*" || t.value === "/" || t.value === "%")) {
        this.pos++;
        const right = this.factor();
        if (right === null) return null;
        if (t.value === "*") left = left * right;
        else if (t.value === "/") left = right === 0 ? NaN : left / right;
        else left = right === 0 ? NaN : left % right;
      } else break;
    }
    return left;
  }

  private factor(): number | null {
    let left = this.unary();
    if (left === null) return null;
    const t = this.peek();
    if (t?.kind === "op" && t.value === "^") {
      this.pos++;
      const right = this.factor();
      if (right === null) return null;
      left = Math.pow(left, right);
    }
    return left;
  }

  private unary(): number | null {
    const t = this.peek();
    if (t?.kind === "op" && (t.value === "-" || t.value === "+")) {
      this.pos++;
      const v = this.unary();
      if (v === null) return null;
      return t.value === "-" ? -v : v;
    }
    return this.primary();
  }

  private primary(): number | null {
    const t = this.peek();
    if (!t) return null;
    if (t.kind === "num") {
      this.pos++;
      return Number(t.value);
    }
    if (t.kind === "paren" && t.value === "(") {
      this.pos++;
      const v = this.expr();
      if (v === null) return null;
      const close = this.peek();
      if (close?.kind !== "paren" || close.value !== ")") return null;
      this.pos++;
      return v;
    }
    if (t.kind === "ident") {
      this.pos++;
      const next = this.peek();
      if (next?.kind === "paren" && next.value === "(") {
        return this.call(t.value);
      }
      // null = cycle détecté par le lookup (buildFormulaScope)
      return this.lookup(t.value);
    }
    return null;
  }

  private call(name: string): number | null {
    const fn = FUNCS[name];
    if (!fn) return null;
    this.pos++; // (
    const args: number[] = [];
    if (this.peek()?.kind === "paren" && this.peek()?.value === ")") {
      this.pos++;
      return null; // 0 argument invalide
    }
    for (;;) {
      const v = this.expr();
      if (v === null) return null;
      args.push(v);
      const sep = this.peek();
      if (sep?.kind === "comma") {
        this.pos++;
        continue;
      }
      if (sep?.kind === "paren" && sep.value === ")") {
        this.pos++;
        break;
      }
      return null;
    }
    return fn(...args);
  }
}

/** Évalue une expression ; `null` si syntaxe invalide ou cycle. */
export function evaluateFormula(expr: string, scope: Record<string, number>): number | null {
  return evaluateWithLookup(expr, (name) => scope[name] ?? 0);
}

function evaluateWithLookup(expr: string, lookup: (name: string) => number | null): number | null {
  const tokens = tokenize(expr);
  if (!tokens) return null;
  const result = new Parser(tokens, lookup).parse();
  if (result === null || !Number.isFinite(result)) return null;
  return result;
}

interface FormulaFieldSchema {
  id: string;
  kind: string;
  expr?: string;
  columns?: { id: string; type: string }[];
}

/** Valeur booléenne tolérante (cases toggle, "oui", 1…). */
function isActive(value: unknown): boolean {
  return value === true || value === 1 || value === "oui" || value === "true";
}

function hasColumn(field: FormulaFieldSchema, id: string): boolean {
  return field.columns?.some((c) => c.id === id) ?? false;
}

/**
 * Construit le scope numérique d'une fiche : valeurs number/counter +
 * résultats des champs formule (résolution récursive, cycles → null).
 *
 * Les modificateurs passifs des sorts (`ability`, ligne non active) et des
 * objets équipés (`inventory`, colonne `equipe`) sont appliqués avant les
 * formules : (base + bonus plats) × (1 + bonus en %).
 */
export function buildFormulaScope(
  schema: { fields: FormulaFieldSchema[] },
  data: Record<string, unknown>,
): Record<string, number> {
  const raw: Record<string, number> = {};
  const formulas = new Map<string, string>();
  const flatBonus = new Map<string, number>();
  const percentBonus = new Map<string, number>();

  for (const f of schema.fields) {
    if (f.kind === "number" || f.kind === "counter") {
      const v = data[f.id];
      const n = typeof v === "number" ? v : Number(v);
      raw[f.id] = Number.isFinite(n) ? n : 0;
    } else if (f.kind === "formula" && f.expr) {
      formulas.set(f.id, f.expr);
    } else if (f.kind === "list" || f.kind === "ability" || f.kind === "inventory") {
      // Agrégats exposés aux formules : <champ>_n (nb lignes) et
      // <champ>_<col> (somme des colonnes nombre) — no-code interconnecté.
      const rows = Array.isArray(data[f.id]) ? (data[f.id] as Record<string, unknown>[]) : [];
      raw[`${f.id}_n`] = rows.length;
      for (const col of f.columns ?? []) {
        if (col.type !== "number") continue;
        let sum = 0;
        for (const r of rows) {
          const n = Number(r?.[col.id]);
          if (Number.isFinite(n)) sum += n;
        }
        raw[`${f.id}_${col.id}`] = Math.round(sum * 1e6) / 1e6;
      }

      // Modificateurs passifs : objets équipés / sorts non actifs.
      // shortcut: ids de colonnes conventionnels (stat/mod/mod_type) ;
      // renommer ces colonnes dans le builder désactive le modificateur.
      const cols =
        f.kind === "ability"
          ? ABILITY_MODIFIER_COLUMNS
          : f.kind === "inventory"
            ? INVENTORY_MODIFIER_COLUMNS
            : null;
      if (cols && hasColumn(f, cols.active)) {
        for (const row of rows) {
          const exposed =
            f.kind === "ability" ? !isActive(row[cols.active]) : isActive(row[cols.active]);
          if (!exposed) continue;
          const stat = row[cols.stat];
          const amount = Number(row[cols.amount]);
          if (typeof stat !== "string" || !stat.trim() || !Number.isFinite(amount)) continue;
          const target = row[cols.mode] === "percent" ? percentBonus : flatBonus;
          target.set(stat, (target.get(stat) ?? 0) + amount);
        }
      }
    } else {
      raw[f.id] = 0;
    }
  }

  for (const [stat, flat] of flatBonus) {
    const next = ((raw[stat] ?? 0) + flat) * (1 + (percentBonus.get(stat) ?? 0) / 100);
    raw[stat] = Math.round(next * 1e6) / 1e6;
  }
  for (const [stat, pct] of percentBonus) {
    if (flatBonus.has(stat)) continue;
    raw[stat] = Math.round((raw[stat] ?? 0) * (1 + pct / 100) * 1e6) / 1e6;
  }

  const cache = new Map<string, number>();
  const visiting = new Set<string>();
  const get = (name: string): number | null => {
    if (name in raw) return raw[name] ?? 0;
    const expr = formulas.get(name);
    if (expr === undefined) return 0; // champ inconnu (supprimé du template)
    if (cache.has(name)) return cache.get(name)!;
    if (visiting.has(name)) return null; // cycle A → B → A
    visiting.add(name);
    const value = evaluateWithLookup(expr, get);
    visiting.delete(name);
    if (value !== null) cache.set(name, value);
    return value;
  };

  const scope: Record<string, number> = { ...raw };
  for (const name of formulas.keys()) {
    const v = get(name);
    if (v !== null) scope[name] = v;
  }
  return scope;
}
