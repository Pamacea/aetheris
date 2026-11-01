// Usage : node packages/database/scripts/cleanup-e2e.mjs            → liste seule (dry-run, aucune écriture)
//         AETHERIS_CLEANUP_CONFIRM=yes node ... --confirm          → suppression réelle
// Portée : utilisateurs @e2e.aetheris.test ou e2e-*@example.com, et campagnes dont TOUS les membres sont marqués.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

/** process.env d'abord ; sinon parsing minimal du .env racine. La valeur n'est jamais affichée. */
function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = path.resolve(SCRIPT_DIR, "../../../.env");
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/);
      if (!match) continue;
      const raw = match[1].trim();
      const quoted = raw.match(/^(['"])(.*)\1$/);
      return quoted ? quoted[2] : raw.split(/\s+#/)[0].trim();
    }
  } catch {
    // Fichier absent ou illisible : on refuse plus bas.
  }
  return undefined;
}

/** Hôte + base uniquement, jamais l'URL complète ni les identifiants. */
function databaseLabel(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${url.hostname}/${url.pathname.replace(/^\//, "")}`;
  } catch {
    return "(illisible)";
  }
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) {
  console.error("DATABASE_URL absent : définissez-le ou renseignez le .env racine.");
  process.exit(1);
}

// Prisma lit la variable lui-même au moment de la requête.
process.env.DATABASE_URL = databaseUrl;

const confirmFlag = process.argv.includes("--confirm");
const confirmEnv = process.env.AETHERIS_CLEANUP_CONFIRM === "yes";

if (confirmFlag && !confirmEnv) {
  console.error("Refus : --confirm exige aussi AETHERIS_CLEANUP_CONFIRM=yes.");
  process.exit(1);
}

// Critères stricts : aucun autre email ni titre n'entre dans la cible.
const MARKED_USER = {
  OR: [
    { email: { endsWith: "@e2e.aetheris.test" } },
    { email: { startsWith: "e2e-", endsWith: "@example.com" } },
  ],
};

// `some: {}` exclut les campagnes sans membre (orphelines, non attribuables).
const ELIGIBLE_CAMPAIGN = {
  members: { some: {}, every: { user: { is: MARKED_USER } } },
};

const prisma = new PrismaClient();

async function main() {
  const markedUsers = await prisma.user.findMany({ where: MARKED_USER, select: { id: true } });
  const markedIds = markedUsers.map((user) => user.id);

  const eligibleCampaigns = await prisma.campaign.findMany({
    where: ELIGIBLE_CAMPAIGN,
    select: { id: true, title: true },
    orderBy: { createdAt: "asc" },
  });
  const eligibleIds = eligibleCampaigns.map((campaign) => campaign.id);

  const protectedCampaigns = await prisma.campaign.findMany({
    where: { members: { some: { user: { isNot: MARKED_USER } } } },
    select: { id: true, title: true },
    orderBy: { createdAt: "asc" },
  });

  const [entities, scenes, journal, chat, choices, novels, chapters] = await Promise.all([
    prisma.entity.count({ where: { campaignId: { in: eligibleIds } } }),
    prisma.vttScene.count({ where: { campaignId: { in: eligibleIds } } }),
    prisma.journalEntry.count({ where: { campaignId: { in: eligibleIds } } }),
    prisma.chatMessage.count({ where: { campaignId: { in: eligibleIds } } }),
    prisma.playerChoice.count({ where: { campaignId: { in: eligibleIds } } }),
    prisma.novel.count({ where: { authorId: { in: markedIds } } }),
    prisma.chapter.count({ where: { novel: { authorId: { in: markedIds } } } }),
  ]);

  console.log(`Base : ${databaseLabel(databaseUrl)}`);
  console.log(`Mode : ${confirmFlag ? "suppression" : "dry-run (aucune écriture)"}\n`);
  console.log(`Utilisateurs marqués : ${markedIds.length}`);
  console.log(`Campagnes dont tous les membres sont marqués : ${eligibleCampaigns.length}`);
  console.log("Rattaché à ces campagnes / utilisateurs :");
  console.log(`  - entités : ${entities}`);
  console.log(`  - scènes : ${scenes}`);
  console.log(`  - journal : ${journal}`);
  console.log(`  - chat : ${chat}`);
  console.log(`  - choix joueurs : ${choices}`);
  console.log(`  - romans : ${novels}`);
  console.log(`  - chapitres : ${chapters}`);

  console.log(
    `\nCampagnes protégées (au moins un membre non marqué) : ${protectedCampaigns.length}`,
  );
  for (const campaign of protectedCampaigns) {
    console.log(`  - ${campaign.id}  ${campaign.title}`);
  }

  if (!confirmFlag) {
    console.log(
      "\nDry-run : relancez avec --confirm et AETHERIS_CLEANUP_CONFIRM=yes pour supprimer.",
    );
    return;
  }

  // Garde-fou : les deux ensembles doivent rester disjoints.
  const protectedIds = new Set(protectedCampaigns.map((campaign) => campaign.id));
  const overlap = eligibleIds.filter((id) => protectedIds.has(id));
  if (overlap.length > 0) {
    throw new Error(
      `Suppression annulée : ${overlap.length} campagne(s) éligible(s) ont un membre non marqué.`,
    );
  }

  // Les campagnes d'abord (cascade), puis les utilisateurs (cascade sessions/accounts/romans).
  // Le filtre est rejoué à la suppression pour ne jamais toucher une campagne protégée.
  const deletedCampaigns = await prisma.campaign.deleteMany({
    where: { id: { in: eligibleIds }, ...ELIGIBLE_CAMPAIGN },
  });
  const deletedUsers = await prisma.user.deleteMany({ where: MARKED_USER });

  console.log(
    `\nSupprimé : ${deletedCampaigns.count} campagne(s), ${deletedUsers.count} utilisateur(s).`,
  );
  console.log("Les campagnes protégées n'ont pas été touchées.");
}

try {
  await main();
} catch (error) {
  console.error(`Échec : ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
