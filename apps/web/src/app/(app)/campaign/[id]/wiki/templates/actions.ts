"use server";

import { revalidatePath } from "next/cache";
import {
  createTemplateSchema,
  sanitizeCss,
  sanitizeFieldData,
  saveTemplateDataSchema,
  templateSchemaSchema,
  updateTemplateSchema,
} from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";

type TemplateActionResult = { ok: true; id: string } | { ok: false; error: string };

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function revalidateWiki(campaignId: string): void {
  revalidatePath(`/campaign/${campaignId}/wiki`);
  revalidatePath(`/campaign/${campaignId}/wiki/templates`);
}

/** Les mutations de templates sont réservées aux MJ (les joueurs remplissent les fiches). */
async function requireGm(campaignId: string) {
  const member = await requireCampaignMember(campaignId);
  if (!member) return null;
  if (member.role !== "GM") return null;
  return member;
}

export async function createTemplate(
  campaignId: string,
  input: { name: string; category?: string },
): Promise<TemplateActionResult> {
  if (!(await requireGm(campaignId))) return invalid("Réservé aux MJ.");

  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }

  const template = await prisma.jsonTemplate.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      schema: { fields: [] },
      campaignId,
    },
    select: { id: true },
  });

  revalidateWiki(campaignId);
  return { ok: true, id: template.id };
}

export async function updateTemplate(
  campaignId: string,
  templateId: string,
  input: { name?: string; category?: string | null; schema?: unknown },
): Promise<TemplateActionResult> {
  if (!(await requireGm(campaignId))) return invalid("Réservé aux MJ.");

  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }

  const owned = await prisma.jsonTemplate.findFirst({
    where: { id: templateId, campaignId },
    select: { id: true },
  });
  if (!owned) return invalid("Template introuvable.");

  await prisma.jsonTemplate.update({
    where: { id: templateId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.schema !== undefined ? { schema: parsed.data.schema as object } : {}),
    },
  });

  revalidateWiki(campaignId);
  return { ok: true, id: templateId };
}

export async function deleteTemplate(
  campaignId: string,
  templateId: string,
): Promise<TemplateActionResult> {
  if (!(await requireGm(campaignId))) return invalid("Réservé aux MJ.");

  const owned = await prisma.jsonTemplate.findFirst({
    where: { id: templateId, campaignId },
    select: { id: true },
  });
  if (!owned) return invalid("Template introuvable.");

  // Les fiches existantes restent des notes (type orphelin → note libre).
  await prisma.jsonTemplate.delete({ where: { id: templateId } });
  revalidateWiki(campaignId);
  return { ok: true, id: templateId };
}

type ImportTemplatesResult =
  | { ok: true; imported: number; overwritten: number }
  | { ok: false; error: string };

/**
 * Import JSON (type LoreKit d'Amsel) : structure seule, jamais le contenu.
 * Un template homonyme est écrasé (comportement documenté dans l'UI).
 */
export async function importTemplates(
  campaignId: string,
  payload: unknown,
): Promise<ImportTemplatesResult> {
  if (!(await requireGm(campaignId))) {
    return { ok: false, error: "Réservé aux MJ." };
  }

  const root = payload as {
    templates?: { name?: unknown; category?: unknown; schema?: unknown }[];
  };
  if (!root || !Array.isArray(root.templates)) {
    return { ok: false, error: "Format de fichier invalide." };
  }
  if (root.templates.length > 50) {
    return { ok: false, error: "50 templates maximum par import." };
  }

  let imported = 0;
  let overwritten = 0;
  for (const t of root.templates) {
    const meta = createTemplateSchema.safeParse({
      name: t?.name,
      ...(typeof t?.category === "string" ? { category: t.category } : {}),
    });
    const schema = templateSchemaSchema.safeParse(t?.schema);
    if (!meta.success || !schema.success) continue; // entrée ignorée

    const existing = await prisma.jsonTemplate.findFirst({
      where: {
        campaignId,
        name: { equals: meta.data.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existing) {
      await prisma.jsonTemplate.update({
        where: { id: existing.id },
        data: {
          category: meta.data.category ?? null,
          schema: schema.data as object,
        },
      });
      overwritten++;
    } else {
      await prisma.jsonTemplate.create({
        data: {
          name: meta.data.name,
          category: meta.data.category ?? null,
          schema: schema.data as object,
          campaignId,
        },
      });
    }
    imported++;
  }

  if (imported === 0) return { ok: false, error: "Aucun template valide." };
  revalidateWiki(campaignId);
  return { ok: true, imported, overwritten };
}

/** Sauvegarde des valeurs d'une fiche (autosave du formulaire). */
export async function saveTemplateData(
  campaignId: string,
  entityId: string,
  data: Record<string, unknown>,
): Promise<TemplateActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Accès refusé.");

  const parsed = saveTemplateDataSchema.safeParse({ data });
  if (!parsed.success) return invalid("Données invalides.");

  const entity = await prisma.entity.findFirst({
    where: { id: entityId, campaignId },
    select: { id: true, type: true, data: true },
  });
  if (!entity) return invalid("Fiche introuvable.");
  if (entity.type === "note") return invalid("Note libre sans template.");

  const template = await prisma.jsonTemplate.findFirst({
    where: { id: entity.type, campaignId },
    select: { schema: true },
  });
  if (!template) return invalid("Template introuvable (fiche orpheline).");

  const schema = templateSchemaSchema.safeParse(template.schema);
  if (!schema.success) return invalid("Schéma de template corrompu.");

  // `saveTemplateDataSchema` enveloppe sous `{ data }` : il faut déballer.
  const clean = sanitizeFieldData(schema.data, parsed.data.data);

  // CSS sanitisé à l'écriture (jamais seulement côté client). Le JS n'est
  // jamais évalué ici : il ne s'exécute que dans la sandbox iframe.
  for (const f of schema.data.fields) {
    if (f.kind !== "css") continue;
    const raw = clean[f.id];
    const r = sanitizeCss(typeof raw === "string" ? raw : "");
    if (!r.ok) return invalid(r.error);
    clean[f.id] = r.css;
  }

  // `clean` ne contient que les champs : les blocs structurés déjà stockés
  // (panneau Blocs) sont conservés — jamais purgés par l'autosave, jamais
  // écrasés par le client (écriture MJ seule via saveNoteBlocks).
  const previous = entity.data as Record<string, unknown> | null;
  const dataToWrite: Record<string, unknown> = { ...clean };
  delete dataToWrite.blocks;
  if (previous && "blocks" in previous) dataToWrite.blocks = previous.blocks;
  await prisma.entity.update({
    where: { id: entityId },
    data: { data: dataToWrite as object },
  });

  return { ok: true, id: entityId };
}
