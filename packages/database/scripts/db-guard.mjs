// Garde-fou avant toute commande Prisma qui écrit en base.
// Ne jamais afficher DATABASE_URL : seuls le hostname et le nom de base sortent.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ACTIONS = new Set(["push", "reset", "migrate-dev"]);
const COMMANDS = {
  push: ["prisma", "db", "push"],
  reset: ["prisma", "migrate", "reset", "--force"],
  "migrate-dev": ["prisma", "migrate", "dev"],
};
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "host.docker.internal"]);

/** Extrait hostname + base d'une URL PostgreSQL, sans credentials ni query. */
export function parseDatabaseUrl(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!hostname || !database) return null;
  return { hostname, database };
}

export function isLocalHost(hostname) {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

/** Parseur .env minimal (KEY=VALUE, export optionnel, quotes). */
export function parseEnv(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

/** process.env d'abord, puis ../../.env (relatif au script). */
export function readDatabaseUrl(env, envPath) {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  try {
    return parseEnv(readFileSync(envPath, "utf8")).DATABASE_URL ?? null;
  } catch {
    return null;
  }
}

/** Décide si l'action est autorisée. Aucun accès réseau ni fichier. */
export function evaluateGuard({ action, rawUrl, args = [], env = process.env }) {
  if (!ACTIONS.has(action)) {
    return {
      ok: false,
      message: `Action inconnue « ${action} ». Actions : push, reset, migrate-dev.`,
    };
  }
  const target = parseDatabaseUrl(rawUrl);
  if (!target) {
    return { ok: false, message: "DATABASE_URL absente ou illisible ; écriture refusée." };
  }
  if (args.includes("--accept-data-loss") && env.AETHERIS_ALLOW_DATA_LOSS !== "written-approval") {
    return {
      ok: false,
      message:
        "Refusé : --accept-data-loss exige AETHERIS_ALLOW_DATA_LOSS=written-approval (même en local).",
    };
  }
  if (!isLocalHost(target.hostname) && env.AETHERIS_DB_CONFIRM !== target.hostname) {
    return {
      ok: false,
      message:
        `Refusé : cible distante ${target.hostname}/${target.database}. ` +
        `Posez AETHERIS_DB_CONFIRM=${target.hostname} pour autoriser.`,
    };
  }
  return {
    ok: true,
    target,
    message: `Autorisé : ${action} sur ${target.hostname}/${target.database}.`,
  };
}

function runCli() {
  const argv = process.argv.slice(2);
  const exec = argv.includes("--exec");
  const [action, ...args] = argv.filter((arg) => arg !== "--exec" && arg !== "--");
  // ../../.env vu depuis packages/database, quel que soit le cwd.
  const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const envPath = resolve(packageDir, "../../.env");
  const rawUrl = readDatabaseUrl(process.env, envPath);
  const result = evaluateGuard({ action, rawUrl, args, env: process.env });

  console.log(result.message);
  if (!result.ok) process.exit(1);
  if (!exec) return;

  // En CI, pas de .env : DATABASE_URL vient de process.env.
  const runner = existsSync(envPath) ? ["exec", "dotenv", "-e", "../../.env", "--"] : ["exec"];
  const child = spawnSync("pnpm", [...runner, ...COMMANDS[action], ...args], {
    stdio: "inherit",
    // .cmd shims Windows exigent un shell.
    shell: process.platform === "win32",
  });
  process.exit(child.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
