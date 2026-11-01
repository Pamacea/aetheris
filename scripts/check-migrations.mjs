#!/usr/bin/env node
// Bloque en CI les migrations Prisma destructives (règle expand/contract).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MIGRATIONS_DIR = "packages/database/prisma/migrations";

// Motifs destructifs, dans l'ordre de priorité du rapport.
const RULES = [
  { rule: "DROP DATABASE", re: /\bDROP\s+DATABASE\b/i },
  { rule: "DROP SCHEMA", re: /\bDROP\s+SCHEMA\b/i },
  { rule: "DROP TABLE", re: /\bDROP\s+TABLE\b/i },
  { rule: "DROP TYPE", re: /\bDROP\s+TYPE\b/i },
  { rule: "DROP COLUMN", re: /\bDROP\s+COLUMN\b/i },
  // DROP CONSTRAINT / INDEX / DEFAULT / NOT NULL ne détruisent pas de données.
  {
    rule: "ALTER TABLE ... DROP",
    re: /\bALTER\s+TABLE\b.*\bDROP\s+(?!CONSTRAINT\b|INDEX\b|DEFAULT\b|NOT\s+NULL\b)/i,
  },
  { rule: "ALTER COLUMN ... TYPE", re: /\bALTER\s+COLUMN\b.*?\b(?:SET\s+DATA\s+)?TYPE\b/i },
  { rule: "RENAME", re: /\bRENAME\b/i },
  { rule: "TRUNCATE", re: /\bTRUNCATE\b/i },
  { rule: "DELETE FROM", re: /\bDELETE\s+FROM\b/i },
];

// Remplace commentaires et littéraux par des espaces (les sauts de ligne sont conservés).
export function stripCommentsAndStrings(sql) {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];
    if (c === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      out += " ".repeat(stop - i);
      i = stop;
    } else if (c === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      out += sql.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (c === "'" || c === '"') {
      // Chaîne SQL ('') ou identifiant (""), avec échappement par doublage.
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === c) {
          if (sql[j + 1] === c) {
            j += 2;
            continue;
          }
          j += 1;
          break;
        }
        j += 1;
      }
      out += sql.slice(i, j).replace(/[^\n]/g, " ");
      i = j;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

// Retourne [{ line, text, rule }] pour chaque ligne contenant un motif destructif.
export function destructiveStatements(sql) {
  const cleanedLines = stripCommentsAndStrings(sql).split("\n");
  const originalLines = sql.split("\n");
  const findings = [];
  cleanedLines.forEach((line, index) => {
    const match = RULES.find(({ re }) => re.test(line));
    if (match) {
      findings.push({ line: index + 1, text: originalLines[index].trim(), rule: match.rule });
    }
  });
  return findings;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

// Migrations ajoutées/modifiées entre `base` et HEAD (AM = add/modify).
function changedMigrations(base) {
  return git(["diff", "--name-only", "--diff-filter=AM", `${base}...HEAD`, "--", MIGRATIONS_DIR])
    .split("\n")
    .filter((path) => path.endsWith("/migration.sql"));
}

// Toutes les migrations suivies par git (audit informatif de l'historique).
function allMigrations() {
  return git(["ls-files", "--", MIGRATIONS_DIR])
    .split("\n")
    .filter((path) => path.endsWith("/migration.sql"));
}

function parseArgs(argv) {
  const options = { base: "HEAD~1", all: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--all") options.all = true;
    else if (argv[i] === "--base") options.base = argv[i + 1] ?? options.base;
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const { base, all } = parseArgs(argv);
  let files;
  try {
    files = all ? allMigrations() : changedMigrations(base);
  } catch (error) {
    console.error(`Impossible de lister les migrations : ${error.message}`);
    return 1;
  }

  if (files.length === 0) {
    console.log(
      all
        ? "Aucune migration trouvée."
        : `Aucune migration ajoutée/modifiée entre ${base} et HEAD.`,
    );
    return 0;
  }

  let total = 0;
  for (const file of files) {
    for (const finding of destructiveStatements(readFileSync(file, "utf8"))) {
      total += 1;
      console.log(`${file}:${finding.line}: ${finding.text}  [${finding.rule}]`);
    }
  }

  if (all) {
    console.log(
      total === 0
        ? `Audit de l'historique : aucun motif destructif sur ${files.length} migration(s).`
        : `Audit de l'historique : ${total} motif(s) destructif(s) sur ${files.length} migration(s) (antérieur au contrôle, informatif).`,
    );
    return 0;
  }

  if (total === 0) {
    console.log(`OK : ${files.length} migration(s) contrôlée(s), aucun motif destructif.`);
    return 0;
  }

  console.error(
    `\n${total} motif(s) destructif(s) détecté(s). Migration destructive bloquée (règle expand/contract).`,
  );
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
