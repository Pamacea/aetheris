"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PLUGIN_CATALOG, type SceneState } from "@aetheris/shared";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHandout } from "@/features/journal/actions";
import { saveSceneState } from "@/features/vtt/actions";
import { createTemplate, updateTemplate } from "@/features/wiki/templates/actions";
import { createWikiEntry, saveWikiEntry } from "@/features/wiki/actions";
import type { CampaignFormState } from "./actions";

const DEMO_TITLE = "Campagne de démonstration";
const DEMO_DESCRIPTION =
  "Une campagne prête à explorer : wiki lié, handout partagé, scène et modèle de fiche.";

/** Lien wiki au format persisté par l'éditeur (`<a data-wiki-link>`). */
function wikiLink(id: string, title: string): string {
  return `<a href="#" class="wiki-link" data-wiki-link="${title}" data-wiki-link-id="${id}">${title}</a>`;
}

/**
 * Crée une campagne de démonstration complète pour l'utilisateur connecté.
 * En cas d'échec en cours de seed, la campagne (et son contenu en cascade)
 * est supprimée : jamais de demi-démonstration laissée au dashboard.
 */
export async function createDemoCampaign(): Promise<CampaignFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  let campaignId: string;
  try {
    campaignId = await seedDemoCampaign(session.user.id);
  } catch {
    return { error: "Création de la démonstration impossible. Réessayez." };
  }

  revalidatePath("/dashboard");
  // Hors try/catch : redirect lève une exception de contrôle Next.
  redirect(`/campaign/${campaignId}`);
}

async function seedDemoCampaign(userId: string): Promise<string> {
  // Même configuration que createCampaign : tous les modules du catalogue.
  const campaign = await prisma.campaign.create({
    data: {
      title: DEMO_TITLE,
      theme: "arcane",
      description: DEMO_DESCRIPTION,
      visibility: "private",
      gameSystem: "custom",
      enabledPlugins: ["lore-wiki", ...PLUGIN_CATALOG.map((p) => p.id)],
      members: { create: { userId, role: "GM" } },
    },
    select: { id: true },
  });

  try {
    await seedDemoContent(campaign.id);
  } catch (error) {
    await prisma.campaign.delete({ where: { id: campaign.id } }).catch(() => undefined);
    throw error;
  }
  return campaign.id;
}

async function seedDemoContent(campaignId: string): Promise<void> {
  // 1. Wiki : trois notes qui se citent mutuellement.
  const village = await createWikiEntry(campaignId, {
    title: "Le Village de Brumebois",
    folder: "Lieux",
  });
  if (!village.ok) throw new Error(village.error);
  const ysolde = await createWikiEntry(campaignId, {
    title: "Mère Ysolde",
    folder: "Personnages",
  });
  if (!ysolde.ok) throw new Error(ysolde.error);
  const cloche = await createWikiEntry(campaignId, {
    title: "La Cloche de Brumebois",
    folder: "Objets",
  });
  if (!cloche.ok) throw new Error(cloche.error);

  const contents: [string, string][] = [
    [
      village.id,
      `<p>Un hameau noyé dans la brume, au pied du col. ${wikiLink(ysolde.id, "Mère Ysolde")} y tient l’auberge, et l’on dit que ${wikiLink(cloche.id, "La Cloche de Brumebois")} sonne seule les nuits sans lune.</p>`,
    ],
    [
      ysolde.id,
      `<p>Aubergiste au regard perçant. Elle connaît chaque ruelle de ${wikiLink(village.id, "Le Village de Brumebois")} et refuse de parler de ${wikiLink(cloche.id, "La Cloche de Brumebois")}.</p>`,
    ],
    [
      cloche.id,
      `<p>Une cloche de bronze fêlée, remontée du puits. ${wikiLink(ysolde.id, "Mère Ysolde")} affirme qu’elle protège ${wikiLink(village.id, "Le Village de Brumebois")}.</p>`,
    ],
  ];
  for (const [id, html] of contents) {
    const saved = await saveWikiEntry(campaignId, id, html);
    if (!saved.ok) throw new Error(saved.error);
  }

  // 2. Un handout déjà partagé aux joueurs.
  const handout = await createHandout(campaignId, {
    title: "Bienvenue à Brumebois",
    content:
      "Le brouillard se lève sur la place du village. Trois lanternes clignotent à l’auberge de Mère Ysolde.",
    shared: true,
  });
  if (!handout.ok) throw new Error(handout.error);

  // 3. Un modèle de fiche minimal, avec des champs lisibles par le combat.
  const template = await createTemplate(campaignId, {
    name: "Personnage",
    category: "Fiches",
  });
  if (!template.ok) throw new Error(template.error);
  const templateUpdated = await updateTemplate(campaignId, template.id, {
    schema: {
      fields: [
        { id: "concept", label: "Concept", kind: "text" },
        { id: "pv", label: "Points de vie", kind: "counter", default: 10, max: 50 },
        { id: "pv_max", label: "PV maximum", kind: "number", default: 10 },
        { id: "ca", label: "Classe d’armure", kind: "number", default: 10, min: 0, max: 30 },
      ],
    },
  });
  if (!templateUpdated.ok) throw new Error(templateUpdated.error);

  // 4. Une scène sans carte externe : deux jetons avec PV et CA.
  const scene: SceneState = {
    tokens: [
      {
        id: randomUUID(),
        x: 320,
        y: 320,
        size: 64,
        rot: 0,
        name: "Mère Ysolde",
        color: "#c2410c",
        hp: 12,
        hpMax: 12,
        ac: 12,
        noteId: null,
        ownerId: null,
        sight: { enabled: true, rangeCells: null, type: "normal" },
      },
      {
        id: randomUUID(),
        x: 480,
        y: 400,
        size: 64,
        rot: 0,
        name: "Loup des brumes",
        color: "#475569",
        hp: 11,
        hpMax: 11,
        ac: 13,
        noteId: null,
        ownerId: null,
        sight: { enabled: true, rangeCells: null, type: "normal" },
      },
    ],
    walls: [],
    grid: { type: "square", size: 64, offsetX: 0, offsetY: 0 },
    mapUrl: null,
    fog: { on: false, sightCells: 10 },
    theatreNotes: [],
  };
  const sceneSaved = await saveSceneState(campaignId, scene);
  if (!sceneSaved.ok) throw new Error(sceneSaved.error);
}
