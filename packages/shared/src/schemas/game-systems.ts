import { z } from "zod";
import { createCampaignSchema } from "./campaign.js";
import { templateSchemaSchema, type TemplateField, type TemplateSchema } from "./templates.js";

/**
 * Hub de systèmes de JDR : presets officiels + systèmes homebrew.
 *
 * Un système fournit des modèles de fiches (`templates`, au format
 * `TemplateSchema` du wiki) et des assets de base (sorts, compétences,
 * traits). Les presets vivent en code ; les systèmes personnalisés sont
 * persistés dans `GameSystem` (ownerId) et peuvent être exportés/importés
 * en JSON strict.
 */

export const systemGenreSchema = z.enum([
  "fantasy",
  "horreur",
  "sci-fi",
  "cyberpunk",
  "enquete",
  "narratif",
  "autre",
]);
export type SystemGenre = z.infer<typeof systemGenreSchema>;

export const SYSTEM_GENRES: ReadonlyArray<{ id: SystemGenre; label: string }> = [
  { id: "fantasy", label: "Fantasy" },
  { id: "horreur", label: "Horreur" },
  { id: "sci-fi", label: "Science-fiction" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "enquete", label: "Enquête" },
  { id: "narratif", label: "Narratif" },
  { id: "autre", label: "Autre" },
];

export const systemAssetKindSchema = z.enum(["spell", "skill", "item", "trait"]);
export type SystemAssetKind = z.infer<typeof systemAssetKindSchema>;

export const systemAssetSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  kind: systemAssetKindSchema,
  description: z.string().trim().max(500).optional(),
});
export type SystemAsset = z.infer<typeof systemAssetSchema>;

export const systemTemplateSeedSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(300).optional(),
  /** Style du modèle, re-sanitisé côté serveur à l'écriture. */
  customCss: z.string().max(20_000).optional(),
  schema: templateSchemaSchema,
});
export type SystemTemplateSeed = z.infer<typeof systemTemplateSeedSchema>;

export const systemTemplateSeedListSchema = z.array(systemTemplateSeedSchema).max(50);

/**
 * Note de Lore transportée par un système puis seedée en `Entity` de type
 * `note` à la création (ou l'application) d'une campagne.
 */
export const systemLoreNoteSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  contentHtml: z.string().max(100_000).default(""),
  folder: z.string().trim().max(120).optional(),
  /** Note secrète MJ : jamais exportée par défaut lors d'une capture. */
  gmOnly: z.boolean().optional(),
});
export type SystemLoreNote = z.infer<typeof systemLoreNoteSchema>;

export const systemLoreNoteListSchema = z.array(systemLoreNoteSchema).max(50);

/** Handout de journal transporté par un système puis seedé dans la campagne. */
export const systemHandoutSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  content: z.string().max(20_000).default(""),
  /** true = visible des joueurs dès la création. */
  shared: z.boolean().optional(),
});
export type SystemHandout = z.infer<typeof systemHandoutSchema>;

export const systemHandoutListSchema = z.array(systemHandoutSchema).max(50);

/**
 * Prétiré d'un système : une fiche déjà remplie (PNJ ou personnage jouable),
 * rattachée au modèle seedé par son nom. `data` suit les ids de champs du modèle.
 */
export const systemPregenSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  template: z.string().trim().min(1).max(120),
  folder: z.string().trim().max(120).optional(),
  data: z.record(z.string(), z.unknown()).default({}),
  /** Notes complémentaires (wiki) ; `[[Titre]]` convertis au seed. */
  content: z.string().max(4_000).optional(),
});
export type SystemPregen = z.infer<typeof systemPregenSchema>;
export const systemPregenListSchema = z.array(systemPregenSchema).max(50);

/** Jeton de la scène d'ouverture seedée avec la campagne. */
export const systemSceneTokenSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  hp: z.number().nullable().optional(),
  hpMax: z.number().nullable().optional(),
  ac: z.number().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#8a7a68"),
});
export type SystemSceneToken = z.infer<typeof systemSceneTokenSchema>;

export const systemSceneSchema = z.strictObject({
  tokens: z.array(systemSceneTokenSchema).max(12).default([]),
});
export type SystemScene = z.infer<typeof systemSceneSchema>;

/** Identifiant de champ stable dérivé d'un nom de caractéristique. */
export function systemFieldId(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  const id = base || "champ";
  return /^[a-z]/.test(id) ? id : `f_${id}`;
}

export const characteristicTypeSchema = z.enum(["text", "number", "counter", "formula"]);
export type CharacteristicType = z.infer<typeof characteristicTypeSchema>;

export const systemCharacteristicSchema = z
  .strictObject({
    name: z.string().trim().min(1, "Nom de caractéristique requis.").max(80),
    type: characteristicTypeSchema,
    /** Expression de formule (ex. « force + dexterite ») — type formula uniquement. */
    formula: z.string().trim().min(1).max(200).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "formula" && !value.formula) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["formula"],
        message: "Formule requise pour une caractéristique de type formule.",
      });
    }
    if (value.type !== "formula" && value.formula) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["formula"],
        message: "Formule interdite hors du type formule.",
      });
    }
  });
export type SystemCharacteristic = z.infer<typeof systemCharacteristicSchema>;

export const systemCharacteristicsSchema = z
  .array(systemCharacteristicSchema)
  .min(1, "Ajoutez au moins une caractéristique.")
  .max(40, "40 caractéristiques maximum.")
  .superRefine((values, ctx) => {
    const seen = new Map<string, number>();
    for (const [index, value] of values.entries()) {
      const id = systemFieldId(value.name);
      const previous = seen.get(id);
      if (previous !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "name"],
          message: `Identifiant « ${id} » déjà utilisé (caractéristique ${previous + 1}).`,
        });
      } else {
        seen.set(id, index);
      }
    }
  });

/** Caractéristique → champ de fiche (même format que le builder de templates). */
export function characteristicToField(characteristic: SystemCharacteristic): TemplateField {
  const id = systemFieldId(characteristic.name);
  const label = characteristic.name;
  switch (characteristic.type) {
    case "number":
      return { id, label, kind: "number" };
    case "counter":
      return { id, label, kind: "counter", default: 0, step: 1 };
    case "formula":
      return { id, label, kind: "formula", expr: characteristic.formula ?? "0" };
    default:
      return { id, label, kind: "text" };
  }
}

/** Modèle « Personnage » généré depuis les caractéristiques d'un système homebrew. */
export function buildCharacteristicTemplate(
  characteristics: SystemCharacteristic[],
): SystemTemplateSeed {
  const schema: TemplateSchema = {
    fields: characteristics.map(characteristicToField),
  };
  return {
    name: "Personnage",
    category: "Personnages",
    description: "Modèle généré depuis les caractéristiques du système homebrew.",
    schema,
  };
}

/** Payload du Homebrew System Builder (frontière serveur). */
export const createCustomGameSystemSchema = z.strictObject({
  name: z.string().trim().min(1, "Nom du système requis.").max(120),
  description: z.string().trim().max(500).optional(),
  genre: systemGenreSchema,
  characteristics: systemCharacteristicsSchema,
});
export type CreateCustomGameSystemInput = z.infer<typeof createCustomGameSystemSchema>;

/**
 * Format d'export/import JSON. Strict : toute clé inconnue est refusée.
 * Un import peut fournir des modèles déjà construits, ou des
 * caractéristiques (converties en modèle « Personnage »).
 */
export const gameSystemImportSchema = z
  .strictObject({
    name: z.string().trim().min(1, "Nom du système requis.").max(120),
    description: z.string().trim().max(500).optional(),
    genre: systemGenreSchema,
    characteristics: systemCharacteristicsSchema.optional(),
    templates: systemTemplateSeedListSchema.optional(),
    assets: z.array(systemAssetSchema).max(200).optional(),
    lore: systemLoreNoteListSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.templates?.length && !value.characteristics?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["templates"],
        message: "Fournissez au moins un modèle ou une caractéristique.",
      });
    }
  });
export type GameSystemImport = z.infer<typeof gameSystemImportSchema>;

export interface GameSystemPreset {
  id: string;
  name: string;
  description: string;
  genre: SystemGenre;
  templates: SystemTemplateSeed[];
  assets: SystemAsset[];
  /** Notes de wiki seedées : livret de règles, lieux, PNJ, objets. */
  lore: SystemLoreNote[];
  /** Handouts de journal seedés : accroche, briefing, lettre. */
  handouts: SystemHandout[];
  /** Fiches déjà remplies (PNJ, prétirés) rattachées à un modèle du système. */
  pregens: SystemPregen[];
  /** Scène d'ouverture (jetons seuls, sans carte) — optionnelle. */
  scene?: SystemScene;
}

const dnd5e: GameSystemPreset = {
  id: "dnd5e",
  name: "Dungeons & Dragons 5e",
  description: "D20 héroïque : classes, caractéristiques, PV, sorts et équipement.",
  genre: "fantasy",
  templates: [
    {
      name: "Personnage D&D 5e",
      category: "Personnages",
      description: "Fiche complète : classe, niveau, six caractéristiques et inventaire.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          {
            id: "classe",
            label: "Classe",
            kind: "select",
            options: [
              { value: "barbare", label: "Barbare" },
              { value: "barde", label: "Barde" },
              { value: "clerc", label: "Clerc" },
              { value: "druide", label: "Druide" },
              { value: "guerrier", label: "Guerrier" },
              { value: "magicien", label: "Magicien" },
              { value: "rodeur", label: "Rôdeur" },
              { value: "roublard", label: "Roublard" },
            ],
            default: "guerrier",
          },
          { id: "niveau", label: "Niveau", kind: "number", decimals: 0, min: 1, default: 1 },
          { id: "pv", label: "Points de vie", kind: "counter", default: 10, step: 1 },
          { id: "ca", label: "Classe d'armure", kind: "counter", default: 10, step: 1 },
          { id: "force", label: "Force", kind: "number", decimals: 0, default: 10 },
          { id: "dexterite", label: "Dextérité", kind: "number", decimals: 0, default: 10 },
          { id: "constitution", label: "Constitution", kind: "number", decimals: 0, default: 10 },
          { id: "intelligence", label: "Intelligence", kind: "number", decimals: 0, default: 10 },
          { id: "sagesse", label: "Sagesse", kind: "number", decimals: 0, default: 10 },
          { id: "charisme", label: "Charisme", kind: "number", decimals: 0, default: 10 },
          {
            id: "competences",
            label: "Compétences",
            kind: "ability",
            columns: [
              { id: "nom", label: "Compétence", type: "tag", targetCategory: "Compétences" },
              { id: "bonus", label: "Bonus", type: "number" },
            ],
          },
          {
            id: "sorts",
            label: "Sorts",
            kind: "ability",
            columns: [
              { id: "nom", label: "Sort", type: "tag", targetCategory: "Sorts" },
              { id: "niveau", label: "Niveau", type: "number" },
              { id: "effet", label: "Effet", type: "text" },
            ],
          },
          {
            id: "equipement",
            label: "Équipement",
            kind: "inventory",
            columns: [
              { id: "objet", label: "Objet", type: "tag", targetCategory: "Objets" },
              { id: "quantite", label: "Quantité", type: "number" },
              { id: "equipe", label: "Équipé", type: "toggle" },
            ],
          },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
    {
      name: "Créature D&D 5e",
      category: "Bestiaire",
      description: "Bloc de statistiques simplifié pour un adversaire.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          { id: "type", label: "Type", kind: "text" },
          { id: "ca", label: "Classe d'armure", kind: "counter", default: 10, step: 1 },
          { id: "pv", label: "Points de vie", kind: "counter", default: 10, step: 1 },
          { id: "vitesse", label: "Vitesse", kind: "number", decimals: 0, default: 9, unit: "m" },
          { id: "description", label: "Capacités", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    {
      name: "Projectile magique",
      kind: "spell",
      description: "1d4+1 dégâts par projectile, touche automatiquement.",
    },
    {
      name: "Soin léger",
      kind: "spell",
      description: "Rend 1d8 + modificateur de caractéristique de lancement PV.",
    },
    {
      name: "Bouclier",
      kind: "spell",
      description: "+5 à la CA jusqu'au prochain tour.",
    },
    { name: "Athlétisme", kind: "skill", description: "Escalade, saut, natation." },
    { name: "Discrétion", kind: "skill", description: "Se déplacer sans être repéré." },
    { name: "Persuasion", kind: "skill", description: "Influencer par la parole." },
    { name: "Investigation", kind: "skill", description: "Déduire à partir d'indices." },
  ],
  lore: [
    {
      title: "Règles essentielles — D&D 5e",
      folder: "Règles",
      contentHtml:
        "<p>Le socle du jeu tient en trois idées : un d20 contre une difficulté, un modificateur qui pousse le résultat, et un tour découpé en actions.</p>" +
        "<ul>" +
        "<li><strong>Test de caractéristique</strong> : d20 + modificateur (compétence et maîtrise comprises) contre la Classe d’armure ou un DD.</li>" +
        "<li><strong>Avantage / désavantage</strong> : lancer 2d20 et garder le meilleur (ou le pire).</li>" +
        "<li><strong>Initiative</strong> : d20 + modificateur de Dextérité en début de combat.</li>" +
        "<li><strong>Tour</strong> : une action, un déplacement, parfois une action bonus et une réaction.</li>" +
        "<li><strong>Repos court</strong> : dépenser des dés de vie. <strong>Repos long</strong> : PV au maximum et ressources récupérées.</li>" +
        "<li><strong>0 point de vie</strong> : jets de mort — trois succès pour stabiliser, trois échecs pour mourir.</li>" +
        "</ul>",
    },
    {
      title: "Le col de Brumepierre",
      folder: "Lieux",
      contentHtml:
        "<p>Un col de montagne battu par les vents, tenu par un relais de pierre. Les caravanes y paient péage, et les disparitions y sont mises sur le compte du brouillard. [[Sœur Alda]] y accueille les voyageurs.</p>",
    },
    {
      title: "Sœur Alda",
      folder: "Personnages",
      gmOnly: true,
      contentHtml:
        "<p>Aubergiste du relais de [[Le col de Brumepierre]]. Elle protège le passage contre un culte du froid en lui livrant une part des péages. Secret : c’est elle qui a ouvert la porte du temple sous le col.</p>",
    },
  ],
  handouts: [
    {
      title: "Avis de recrutement",
      shared: true,
      content:
        "Le relais du col de Brumepierre cherche des bras sûrs : trois caravanes ont disparu en quinze jours. Prime versée à l’arrivée, danger non garanti absent.",
    },
  ],
  pregens: [
    {
      title: "Dara Vent-de-Fer",
      template: "Personnage D&D 5e",
      content: "Guide du [[Le col de Brumepierre]], elle cherche les caravanes perdues.",
      folder: "Personnages",
      data: {
        nom: "Dara Vent-de-Fer",
        classe: "guerrier",
        niveau: 1,
        pv: 12,
        ca: 16,
        force: 16,
        dexterite: 13,
        constitution: 14,
        intelligence: 10,
        sagesse: 11,
        charisme: 9,
        competences: [
          { nom: "Athlétisme", bonus: 5 },
          { nom: "Intimidation", bonus: 1 },
        ],
        sorts: [],
        equipement: [
          { objet: "Épée longue", quantite: 1, equipe: true },
          { objet: "Bouclier", quantite: 1, equipe: true },
          { objet: "Torche", quantite: 4, equipe: false },
        ],
        notes: "Guide de [[Le col de Brumepierre]]. Cherche les caravanes perdues.",
      },
    },
    {
      title: "Sœur Alda",
      template: "Personnage D&D 5e",
      content: "Aubergiste et guérisseuse du relais du [[Le col de Brumepierre]].",
      folder: "PNJ",
      data: {
        nom: "Sœur Alda",
        classe: "clerc",
        niveau: 2,
        pv: 15,
        ca: 13,
        force: 11,
        dexterite: 12,
        constitution: 13,
        intelligence: 11,
        sagesse: 15,
        charisme: 12,
        competences: [
          { nom: "Médecine", bonus: 4 },
          { nom: "Persuasion", bonus: 3 },
        ],
        sorts: [
          { nom: "Soin léger", niveau: 1, effet: "1d8 + 3 PV rendus." },
          { nom: "Bouclier", niveau: 1, effet: "+5 CA jusqu'au prochain tour." },
        ],
        equipement: [
          { objet: "Masse d'armes", quantite: 1, equipe: true },
          { objet: "Armure de cuir", quantite: 1, equipe: true },
        ],
        notes: "Aubergiste et guérisseuse du relais, à l'écoute de tous les voyageurs.",
      },
    },
  ],
  scene: {
    tokens: [
      { name: "Dara Vent-de-Fer", hp: 12, hpMax: 12, ac: 16, color: "#c2410c" },
      { name: "Loup de givre", hp: 11, hpMax: 11, ac: 13, color: "#475569" },
    ],
  },
};

const cocth: GameSystemPreset = {
  id: "cocth",
  name: "L'Appel de Cthulhu (7e édition)",
  description: "Horreur cosmique en pourcentages : compétences, Santé mentale, Idée et Chance.",
  genre: "horreur",
  templates: [
    {
      name: "Investigateur",
      category: "Personnages",
      description: "Fiche d'enquêteur : caractéristiques, santé mentale et compétences.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          { id: "occupation", label: "Occupation", kind: "text" },
          { id: "age", label: "Âge", kind: "number", decimals: 0, min: 0, default: 30 },
          { id: "force", label: "FOR", kind: "number", decimals: 0, default: 50 },
          { id: "constitution", label: "CON", kind: "number", decimals: 0, default: 50 },
          { id: "taille", label: "TAI", kind: "number", decimals: 0, default: 50 },
          { id: "dexterite", label: "DEX", kind: "number", decimals: 0, default: 50 },
          { id: "apparence", label: "APP", kind: "number", decimals: 0, default: 50 },
          { id: "intelligence", label: "INT", kind: "number", decimals: 0, default: 50 },
          { id: "pouvoir", label: "POU", kind: "number", decimals: 0, default: 50 },
          { id: "education", label: "ÉDU", kind: "number", decimals: 0, default: 50 },
          { id: "sante_mentale", label: "Santé mentale", kind: "counter", default: 50, max: 99 },
          { id: "chance", label: "Chance", kind: "counter", default: 50, max: 99 },
          { id: "idee", label: "Idée", kind: "number", decimals: 0, default: 50 },
          { id: "pv", label: "Points de vie", kind: "counter", default: 10, step: 1 },
          {
            id: "competences",
            label: "Compétences",
            kind: "ability",
            columns: [
              { id: "nom", label: "Compétence", type: "tag", targetCategory: "Compétences" },
              { id: "valeur", label: "Valeur", type: "number" },
            ],
          },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    { name: "Bibliothèque", kind: "skill", description: "Recherche documentaire." },
    { name: "Occultisme", kind: "skill", description: "Connaissance des mythes et rituels." },
    { name: "Fouille", kind: "skill", description: "Fouiller une scène ou un décor." },
    { name: "Psychologie", kind: "skill", description: "Lire les intentions d'autrui." },
    {
      name: "Contact de Nyarlathotep",
      kind: "spell",
      description: "Rituel interdit — coût en santé mentale.",
    },
  ],
  lore: [
    {
      title: "Règles essentielles — L’Appel de Cthulhu (7e édition)",
      folder: "Règles",
      contentHtml:
        "<p>Toutes les caractéristiques et compétences sont en pourcentage (d100), du côté de personnages ordinaires confrontés à l’extraordinaire.</p>" +
        "<ul>" +
        "<li><strong>Jet de compétence</strong> : d100 inférieur ou égal à la valeur. ≤ moitié = réussite difficile, ≤ cinquième = réussite extrême ; un 01 est toujours une réussite.</li>" +
        "<li><strong>Réussite poussée</strong> : relancer un jet raté au prix d’une conséquence (temps, bruit, dégâts) — le joueur raconte l’échec.</li>" +
        "<li><strong>Santé mentale</strong> : POU ÷ 2 × 5 au départ. Chaque horreur inflige une perte de SAN ; un échec peut provoquer une folie temporaire ou une phobie.</li>" +
        "<li><strong>Idée / Chance</strong> : jets d’INT et de Chance (POU×5) pour recoupements et coups de pouce, indépendants de la SAN.</li>" +
        "<li><strong>Combat</strong> : mortel. Fuir, se cacher et négocier valent mieux qu’un échange de coups.</li>" +
        "<li><strong>Enquête</strong> : un indice clé ne devrait jamais dépendre d’un seul jet — prévoir une seconde voie.</li>" +
        "</ul>",
    },
    {
      title: "Manoir Kessler",
      folder: "Lieux",
      contentHtml:
        "<p>Demeure bourgeoise des années 1920, fermée depuis la mort du professeur Kessler. Les voisins parlent de lumières au troisième étage. [[Dr Émile Vasseur]] y a été vu la semaine dernière.</p>",
    },
    {
      title: "Dr Émile Vasseur",
      folder: "Personnages",
      gmOnly: true,
      contentHtml:
        "<p>Médecin légiste et ancien assistant de Kessler. Il a emporté le carnet de recherches du manoir de [[Manoir Kessler]] et cherche à détruire la créature invoquée. Il mentira pour éloigner les enquêteurs.</p>",
    },
  ],
  handouts: [
    {
      title: "Lettre de l’éditeur",
      shared: true,
      content:
        "Cher enquêteur, le professeur Kessler a cessé toute correspondance depuis six semaines. Sa fille vous demande de retrouver ce qui a disparu de son bureau — et de ne rien ébruiter.",
    },
  ],
  pregens: [
    {
      title: "Eleanor Shaw",
      template: "Investigateur",
      content: "Mandatée par la fille du professeur Kessler pour fouiller le [[Manoir Kessler]].",
      folder: "Personnages",
      data: {
        nom: "Eleanor Shaw",
        occupation: "Journaliste indépendante",
        age: 31,
        force: 45,
        constitution: 55,
        taille: 55,
        dexterite: 60,
        apparence: 65,
        intelligence: 70,
        pouvoir: 60,
        education: 75,
        sante_mentale: 55,
        chance: 55,
        idee: 70,
        pv: 11,
        competences: [
          { nom: "Bibliothèque", valeur: 70 },
          { nom: "Fouille", valeur: 55 },
          { nom: "Psychologie", valeur: 60 },
        ],
        notes: "Engagée par la fille du professeur Kessler pour retrouver le carnet disparu.",
      },
    },
    {
      title: "Dr Émile Vasseur",
      template: "Investigateur",
      content: "Dernier assistant de Kessler, il rôde encore autour du [[Manoir Kessler]].",
      folder: "PNJ",
      data: {
        nom: "Dr Émile Vasseur",
        occupation: "Médecin légiste",
        age: 48,
        force: 50,
        constitution: 45,
        taille: 55,
        dexterite: 50,
        apparence: 50,
        intelligence: 80,
        pouvoir: 45,
        education: 85,
        sante_mentale: 35,
        chance: 40,
        idee: 80,
        pv: 10,
        competences: [
          { nom: "Médecine", valeur: 80 },
          { nom: "Occultisme", valeur: 50 },
          { nom: "Psychologie", valeur: 55 },
        ],
        notes: "Ancien assistant de Kessler. Nerveux, évasif, les mains tremblantes.",
      },
    },
  ],
  scene: {
    tokens: [
      { name: "Eleanor Shaw", hp: 11, hpMax: 11, ac: null, color: "#c2410c" },
      { name: "Silhouette du manoir", hp: null, hpMax: null, ac: null, color: "#475569" },
    ],
  },
};

const cyberpunk: GameSystemPreset = {
  id: "cyberpunk",
  name: "Cyberpunk Red",
  description:
    "Dystopie red : d10 + caractéristique + compétence contre un DV, Humanité et cyberware.",
  genre: "cyberpunk",
  templates: [
    {
      name: "Édgerunner",
      category: "Personnages",
      description: "Rôle, caractéristiques REF/DEX/TECH, PV, Humanité et matériel.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          { id: "role", label: "Rôle", kind: "text" },
          { id: "reflexes", label: "REF", kind: "counter", default: 5 },
          { id: "dexterite", label: "DEX", kind: "counter", default: 5 },
          { id: "technique", label: "TECH", kind: "counter", default: 5 },
          { id: "intellect", label: "INT", kind: "counter", default: 5 },
          { id: "volonte", label: "VOL", kind: "counter", default: 5 },
          { id: "constitution", label: "COR", kind: "counter", default: 5 },
          { id: "pv", label: "PV", kind: "counter", default: 25 },
          { id: "humanite", label: "Humanité", kind: "counter", default: 40, max: 60 },
          {
            id: "competences",
            label: "Compétences",
            kind: "ability",
            columns: [
              { id: "nom", label: "Compétence", type: "tag", targetCategory: "Compétences" },
              { id: "valeur", label: "Valeur", type: "number" },
            ],
          },
          {
            id: "equipement",
            label: "Équipement",
            kind: "inventory",
            columns: [
              { id: "objet", label: "Objet", type: "tag", targetCategory: "Objets" },
              { id: "quantite", label: "Qté", type: "number" },
              { id: "equipe", label: "Équipé", type: "toggle" },
            ],
          },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    { name: "Armes de poing", kind: "skill", description: "Pistolet et petit calibre." },
    { name: "Athlétisme", kind: "skill", description: "Course, escalade, saut." },
    { name: "Technique", kind: "skill", description: "Réparer, pirater le matériel." },
    { name: "Négociation", kind: "skill", description: "Marchander, convaincre, bluffer." },
    {
      name: "Interface neurale",
      kind: "trait",
      description: "Liaison directe avec le réseau : +2 aux tests de piratage, −1 Humanité.",
    },
  ],
  lore: [
    {
      title: "Règles essentielles — Cyberpunk Red",
      folder: "Règles",
      contentHtml:
        "<p>Un test = d10 + caractéristique + compétence contre un DV (9 à 29). Les Dix et les Uns comptent double.</p>" +
        "<ul>" +
        "<li><strong>Dix explosif</strong> : relancer et additionner. <strong>Un</strong> : échec critique, soustraire et relancer.</li>" +
        "<li><strong>DV</strong> : 9 simple, 13 standard, 17 difficile, 21 professionnel, 29 quasi impossible.</li>" +
        "<li><strong>Armement lourd</strong> : un tir de roquette ou de canon peut mettre fin à un combat en un round.</li>" +
        "<li><strong>Humanité</strong> : chaque implant cybernétique en coûte une part ; à 0, la cyberpsychose guette.</li>" +
        "<li><strong>Réputation</strong> : la rue vous juge à ce que vous avez fait, pas à ce que vous promettez.</li>" +
        "<li><strong>Eddies</strong> : la monnaie ; une mission standard paie 500 à 2 000.</li>" +
        "</ul>",
    },
    {
      title: "Night City — Heywood",
      folder: "Lieux",
      contentHtml:
        "<p>Quartier de béton et de néons, tenu par les Valentinos. [[Rook]] y distribue les contrats dans l'arrière-salle du Kismet.</p>",
    },
    {
      title: "Rook",
      folder: "Personnages",
      gmOnly: true,
      contentHtml:
        "<p>Fixer de [[Night City — Heywood]]. Il paie les édgerunners pour récupérer un prototype volé à Biotechnica. Il en sait plus qu'il ne le dit : c'est lui qui a commandité le vol, pour le compte d'un client anonyme.</p>",
    },
  ],
  handouts: [
    {
      title: "Contrat : colis Biotechnica",
      shared: true,
      content:
        "Un conteneur réfrigéré a été détourné entre le port et le labo. Retrouvez-le avant l'aube. Pas de témoins, pas de corps identifiables. Paiement : 1 500 eddies, moitié d'avance.",
    },
  ],
  pregens: [
    {
      title: "Vex",
      template: "Édgerunner",
      content: "Édgerunner de [[Night City — Heywood]], engagée via [[Rook]].",
      folder: "Personnages",
      data: {
        nom: "Vex",
        role: "Netrunner",
        reflexes: 7,
        dexterite: 6,
        technique: 8,
        intellect: 7,
        volonte: 5,
        constitution: 4,
        pv: 30,
        humanite: 38,
        competences: [
          { nom: "Interface", valeur: 6 },
          { nom: "Technique", valeur: 6 },
          { nom: "Athlétisme", valeur: 4 },
        ],
        equipement: [
          { objet: "Cyberdeck", quantite: 1, equipe: true },
          { objet: "Pistolet léger", quantite: 1, equipe: true },
          { objet: "Medtech jetable", quantite: 2, equipe: false },
        ],
        notes: "Netrunner discrète, engagée pour ouvrir le conteneur sans laisser de trace.",
      },
    },
    {
      title: "Rook",
      template: "Édgerunner",
      content: "Fixer de [[Night City — Heywood]], il tient l'arrière-salle du Kismet.",
      folder: "PNJ",
      data: {
        nom: "Rook",
        role: "Fixer",
        reflexes: 6,
        dexterite: 6,
        technique: 4,
        intellect: 8,
        volonte: 7,
        constitution: 5,
        pv: 28,
        humanite: 42,
        competences: [
          { nom: "Négociation", valeur: 8 },
          { nom: "Armes de poing", valeur: 5 },
          { nom: "Système", valeur: 6 },
        ],
        equipement: [
          { objet: "Costume blindé", quantite: 1, equipe: true },
          { objet: "Pistolet lourd", quantite: 1, equipe: true },
        ],
        notes:
          "Sourire facile, mémoire longue. Il ne ment jamais sur le prix, seulement sur les risques.",
      },
    },
  ],
  scene: {
    tokens: [
      { name: "Vex", hp: 30, hpMax: 30, ac: null, color: "#c2410c" },
      { name: "Sentinelle de la Militech", hp: 22, hpMax: 22, ac: null, color: "#475569" },
    ],
  },
};

const pathfinder2e: GameSystemPreset = {
  id: "pathfinder2e",
  name: "Pathfinder 2e",
  description: "Tactique et options : dons, états, triple jet de sauvegarde et degrés de réussite.",
  genre: "fantasy",
  templates: [
    {
      name: "Personnage Pathfinder 2e",
      category: "Personnages",
      description: "Ascendance, classe, dons, défenses et inventaire.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          {
            id: "ascendance",
            label: "Ascendance",
            kind: "select",
            options: [
              { value: "humain", label: "Humain" },
              { value: "elfe", label: "Elfe" },
              { value: "nain", label: "Nain" },
              { value: "halfelin", label: "Halfelin" },
              { value: "gnome", label: "Gnome" },
              { value: "orque", label: "Orque" },
              { value: "leshy", label: "Leshy" },
            ],
            default: "humain",
          },
          {
            id: "classe",
            label: "Classe",
            kind: "select",
            options: [
              { value: "alchimiste", label: "Alchimiste" },
              { value: "barde", label: "Barde" },
              { value: "champion", label: "Champion" },
              { value: "druide", label: "Druide" },
              { value: "guerrier", label: "Guerrier" },
              { value: "magicien", label: "Magicien" },
              { value: "moine", label: "Moine" },
              { value: "pretre", label: "Prêtre" },
              { value: "roublard", label: "Roublard" },
              { value: "rodeur", label: "Rôdeur" },
            ],
            default: "guerrier",
          },
          { id: "niveau", label: "Niveau", kind: "number", decimals: 0, min: 1, default: 1 },
          { id: "pv", label: "PV", kind: "counter", default: 18, step: 1 },
          { id: "ca", label: "CA", kind: "counter", default: 17, step: 1 },
          { id: "perception", label: "Perception", kind: "number", decimals: 0, default: 5 },
          { id: "vigueur", label: "Vigueur", kind: "number", decimals: 0, default: 6 },
          { id: "reflexes", label: "Réflexes", kind: "number", decimals: 0, default: 5 },
          { id: "volonte", label: "Volonté", kind: "number", decimals: 0, default: 4 },
          { id: "force", label: "Force", kind: "number", decimals: 0, default: 10 },
          { id: "dexterite", label: "Dextérité", kind: "number", decimals: 0, default: 10 },
          { id: "constitution", label: "Constitution", kind: "number", decimals: 0, default: 10 },
          { id: "intelligence", label: "Intelligence", kind: "number", decimals: 0, default: 10 },
          { id: "sagesse", label: "Sagesse", kind: "number", decimals: 0, default: 10 },
          { id: "charisme", label: "Charisme", kind: "number", decimals: 0, default: 10 },
          {
            id: "dons",
            label: "Dons",
            kind: "list",
            columns: [
              { id: "nom", label: "Don", type: "text" },
              { id: "type", label: "Type", type: "text" },
            ],
          },
          {
            id: "sorts",
            label: "Sorts",
            kind: "ability",
            columns: [
              { id: "nom", label: "Sort", type: "tag", targetCategory: "Sorts" },
              { id: "rang", label: "Rang", type: "number" },
              { id: "effet", label: "Effet", type: "text" },
            ],
          },
          {
            id: "equipement",
            label: "Équipement",
            kind: "inventory",
            columns: [
              { id: "objet", label: "Objet", type: "tag", targetCategory: "Objets" },
              { id: "quantite", label: "Qté", type: "number" },
              { id: "equipe", label: "Équipé", type: "toggle" },
            ],
          },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    { name: "Athlétisme", kind: "skill", description: "Escalade, saut, nage." },
    { name: "Acrobaties", kind: "skill", description: "Équilibre, esquive, chute contrôlée." },
    { name: "Médecine", kind: "skill", description: "Soigner les blessures et les maladies." },
    { name: "Intimidation", kind: "skill", description: "Imposer sa volonté par la menace." },
    {
      name: "Frappe en puissance",
      kind: "trait",
      description: "Une action : +2 aux dégâts par dé de l'arme, −2 à la CA jusqu'au tour suivant.",
    },
  ],
  lore: [
    {
      title: "Règles essentielles — Pathfinder 2e",
      folder: "Règles",
      contentHtml:
        "<p>Un test = d20 + modificateur contre un DD. Les degrés de réussite comptent autant que le résultat.</p>" +
        "<ul>" +
        "<li><strong>Degrés</strong> : réussite = DD atteint ; +10 ou plus = réussite critique ; −10 ou moins = échec critique ; un 20 naturel améliore d’un cran.</li>" +
        "<li><strong>Trois jets de sauvegarde</strong> : Vigueur (CON), Réflexes (DEX), Volonté (SAG), chacun opposé à l’effet.</li>" +
        "<li><strong>Trois actions</strong> par tour : se déplacer, attaquer, lever un bouclier. La seconde attaque subit −5, la troisième −10 (pénalité d’attaques multiples).</li>" +
        "<li><strong>États</strong> : à terre, pris au dépourvu, effrayé… ils modifient les tests et se cumulent rarement.</li>" +
        "<li><strong>Bonus de circonstances</strong> : ne se cumulent pas entre eux ; seul le meilleur compte.</li>" +
        "<li><strong>Récupération</strong> : 10 minutes de repos rendent des PV ; une nuit complète restaure les emplacements de sorts.</li>" +
        "</ul>",
    },
    {
      title: "Port-Émeraude",
      folder: "Lieux",
      contentHtml:
        "<p>Cité marchande bâtie sur une rade aux eaux vertes, en proie à une guilde de contrebandiers. [[Maîtresse Thalia Vorn]] tient le registre des cargaisons — et celui des dettes.</p>",
    },
    {
      title: "Maîtresse Thalia Vorn",
      folder: "Personnages",
      gmOnly: true,
      contentHtml:
        "<p>Juge marchande de [[Port-Émeraude]]. Elle recrute les personnages pour retrouver un registre volé, sans avouer qu’il contient la preuve de son propre trafic. Elle les trahira si la guilde menace sa fille.</p>",
    },
  ],
  handouts: [
    {
      title: "Avis de la Guilde des éclaireurs",
      shared: true,
      content:
        "Prime de 50 pièces d'or pour toute information sur la cargaison disparue du navire Lame-d'Écume. Se présenter au bureau du port avant la marée haute. Discrétion exigée.",
    },
  ],
  pregens: [
    {
      title: "Kaelen Bras-de-fer",
      template: "Personnage Pathfinder 2e",
      content:
        "Recruté par [[Maîtresse Thalia Vorn]] à [[Port-Émeraude]] pour retrouver la cargaison de la Lame-d’Écume.",
      folder: "Personnages",
      data: {
        nom: "Kaelen Bras-de-fer",
        ascendance: "humain",
        classe: "guerrier",
        niveau: 1,
        pv: 19,
        ca: 18,
        perception: 7,
        vigueur: 8,
        reflexes: 6,
        volonte: 5,
        force: 18,
        dexterite: 14,
        constitution: 16,
        intelligence: 10,
        sagesse: 12,
        charisme: 10,
        dons: [{ nom: "Frappe en puissance", type: "Don de classe" }],
        sorts: [],
        equipement: [
          { objet: "Épée longue", quantite: 1, equipe: true },
          { objet: "Cotte de mailles", quantite: 1, equipe: true },
          { objet: "Potion de soins", quantite: 2, equipe: false },
        ],
        notes: "Vétéran de la garde du port. Cherche son frère disparu sur la Lame-d'Écume.",
      },
    },
  ],
  scene: {
    tokens: [
      { name: "Kaelen Bras-de-fer", hp: 19, hpMax: 19, ac: 18, color: "#c2410c" },
      { name: "Goule des docks", hp: 12, hpMax: 12, ac: 15, color: "#475569" },
    ],
  },
};

const chroniques: GameSystemPreset = {
  id: "chroniques-oubliees",
  name: "Chroniques Oubliées Fantasy",
  description: "Initiation et campagnes modulaires : profils, voies et rangs.",
  genre: "fantasy",
  templates: [
    {
      name: "Aventurier COF",
      category: "Personnages",
      description: "Profil, peuple, voies et équipement — fiche d'initiation complète.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          {
            id: "peuple",
            label: "Peuple",
            kind: "select",
            options: [
              { value: "humain", label: "Humain" },
              { value: "elfe", label: "Elfe" },
              { value: "nain", label: "Nain" },
              { value: "halfelin", label: "Halfelin" },
              { value: "demi-orc", label: "Demi-orc" },
            ],
            default: "humain",
          },
          {
            id: "profil",
            label: "Profil",
            kind: "select",
            options: [
              { value: "barbare", label: "Barbare" },
              { value: "barde", label: "Barde" },
              { value: "chevalier", label: "Chevalier" },
              { value: "druide", label: "Druide" },
              { value: "ensorceleur", label: "Ensorceleur" },
              { value: "guerrier", label: "Guerrier" },
              { value: "pretre", label: "Prêtre" },
              { value: "rodeur", label: "Rôdeur" },
              { value: "voleur", label: "Voleur" },
            ],
            default: "guerrier",
          },
          { id: "niveau", label: "Niveau", kind: "number", decimals: 0, min: 1, default: 1 },
          { id: "pv", label: "PV", kind: "counter", default: 12, step: 1 },
          { id: "defense", label: "DEF", kind: "counter", default: 14, step: 1 },
          { id: "initiative", label: "Initiative", kind: "number", decimals: 0, default: 2 },
          { id: "attaque", label: "Attaque", kind: "number", decimals: 0, default: 4 },
          { id: "force", label: "FOR", kind: "number", decimals: 0, default: 10 },
          { id: "dexterite", label: "DEX", kind: "number", decimals: 0, default: 10 },
          { id: "constitution", label: "CON", kind: "number", decimals: 0, default: 10 },
          { id: "intelligence", label: "INT", kind: "number", decimals: 0, default: 10 },
          { id: "sagesse", label: "SAG", kind: "number", decimals: 0, default: 10 },
          { id: "charisme", label: "CHA", kind: "number", decimals: 0, default: 10 },
          {
            id: "voies",
            label: "Voies",
            kind: "list",
            columns: [
              { id: "nom", label: "Voie", type: "text" },
              { id: "rang", label: "Rang", type: "number" },
            ],
          },
          {
            id: "sorts",
            label: "Sorts",
            kind: "ability",
            columns: [
              { id: "nom", label: "Sort", type: "tag", targetCategory: "Sorts" },
              { id: "rang", label: "Rang", type: "number" },
              { id: "effet", label: "Effet", type: "text" },
            ],
          },
          {
            id: "equipement",
            label: "Équipement",
            kind: "inventory",
            columns: [
              { id: "objet", label: "Objet", type: "tag", targetCategory: "Objets" },
              { id: "quantite", label: "Qté", type: "number" },
              { id: "equipe", label: "Équipé", type: "toggle" },
            ],
          },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    { name: "Discrétion", kind: "skill", description: "Se déplacer sans être entendu." },
    { name: "Escalade", kind: "skill", description: "Grimper une paroi ou un mur." },
    { name: "Survie", kind: "skill", description: "Pister, camper, se nourrir en pleine nature." },
    { name: "Charme", kind: "skill", description: "Convaincre par la séduction ou l'éloquence." },
    {
      name: "Rage",
      kind: "trait",
      description: "Voie du barbare, rang 1 : bonus aux dégâts tant que la rage dure.",
    },
  ],
  lore: [
    {
      title: "Règles essentielles — Chroniques Oubliées",
      folder: "Règles",
      contentHtml:
        "<p>Un test = d20 + valeur de caractéristique + niveau contre une difficulté (10 à 25). La DEF se calcule à partir de la DEX et de l’armure.</p>" +
        "<ul>" +
        "<li><strong>Voies</strong> : chaque profil possède des voies de capacités ; les rangs s’achètent avec l’expérience.</li>" +
        "<li><strong>PV</strong> : 1d6 à 1d10 par niveau selon le profil, modifiés par la CON.</li>" +
        "<li><strong>Initiative</strong> : d20 + DEX ; un 20 naturel offre une action supplémentaire.</li>" +
        "<li><strong>Récupération</strong> : une nuit de repos rend les PV ; un soin rapide coûte un sort ou une capacité.</li>" +
        "<li><strong>Difficultés</strong> : facile 10, moyenne 15, difficile 20, très difficile 25.</li>" +
        "</ul>",
    },
    {
      title: "Val d'Ombrelune",
      folder: "Lieux",
      contentHtml:
        "<p>Village de frontière blotti sous une lune permanente. Le pont de pierre est la seule sortie ; les caravanes y paient un péage à [[Sieur Aldric]].</p>",
    },
    {
      title: "Sieur Aldric",
      folder: "Personnages",
      gmOnly: true,
      contentHtml:
        "<p>Seigneur du [[Val d'Ombrelune]], aimé et endetté. Il finance les personnages pour récupérer le sceau volé du pont — sans lui, le péage s'effondre et son château avec.</p>",
    },
  ],
  handouts: [
    {
      title: "Appel à l'aventure",
      shared: true,
      content:
        "Le sceau du pont d'Ombrelune a disparu. Quiconque le rapportera recevra trois fois le péage d'une lune, et l'amitié du Val. Adressez-vous à la taverne du Croissant.",
    },
  ],
  pregens: [
    {
      title: "Brannoc le Hardi",
      template: "Aventurier COF",
      content:
        "Garde de caravane au service de [[Sieur Aldric]], il rentre au [[Val d'Ombrelune]] avec le sceau volé.",
      folder: "Personnages",
      data: {
        nom: "Brannoc le Hardi",
        peuple: "nain",
        profil: "guerrier",
        niveau: 1,
        pv: 14,
        defense: 16,
        initiative: 1,
        attaque: 5,
        force: 15,
        dexterite: 11,
        constitution: 14,
        intelligence: 9,
        sagesse: 12,
        charisme: 10,
        voies: [{ nom: "Voie du combattant", rang: 1 }],
        sorts: [],
        equipement: [
          { objet: "Hache de bataille", quantite: 1, equipe: true },
          { objet: "Cotte de mailles", quantite: 1, equipe: true },
          { objet: "Rations", quantite: 3, equipe: false },
        ],
        notes: "Ancien garde de la caravane, il cherche le sceau pour rembourser une dette.",
      },
    },
  ],
  scene: {
    tokens: [
      { name: "Brannoc le Hardi", hp: 14, hpMax: 14, ac: 16, color: "#c2410c" },
      { name: "Loup d'Ombrelune", hp: 9, hpMax: 9, ac: 13, color: "#475569" },
    ],
  },
};

const warhammer: GameSystemPreset = {
  id: "warhammer4",
  name: "Warhammer Fantasy Roleplay (4e éd.)",
  description: "Dark fantasy graveleuse : caractéristiques en %, Destin et Résilience.",
  genre: "fantasy",
  templates: [
    {
      name: "Aventurier WFRP 4e",
      category: "Personnages",
      description: "Carrières, caractéristiques principales et secondaires, Destin et Résilience.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          {
            id: "espece",
            label: "Espèce",
            kind: "select",
            options: [
              { value: "humain", label: "Humain" },
              { value: "nain", label: "Nain" },
              { value: "halfelin", label: "Halfelin" },
              { value: "elfe", label: "Elfe" },
            ],
            default: "humain",
          },
          { id: "carriere", label: "Carrière", kind: "text" },
          {
            id: "statut",
            label: "Statut",
            kind: "select",
            options: [
              { value: "laiton", label: "Laiton" },
              { value: "argent", label: "Argent" },
              { value: "or", label: "Or" },
            ],
            default: "laiton",
          },
          { id: "cc", label: "CC", kind: "counter", default: 30 },
          { id: "ct", label: "CT", kind: "counter", default: 30 },
          { id: "force", label: "F", kind: "counter", default: 30 },
          { id: "endurance", label: "E", kind: "counter", default: 30 },
          { id: "initiative", label: "I", kind: "counter", default: 30 },
          { id: "agilite", label: "Agi", kind: "counter", default: 30 },
          { id: "dexterite", label: "Dex", kind: "counter", default: 30 },
          { id: "intelligence", label: "Int", kind: "counter", default: 30 },
          { id: "fm", label: "FM", kind: "counter", default: 30 },
          { id: "soc", label: "Soc", kind: "counter", default: 30 },
          { id: "blessures", label: "Blessures", kind: "counter", default: 12 },
          { id: "destin", label: "Destin", kind: "counter", default: 2 },
          { id: "resilience", label: "Résilience", kind: "counter", default: 2 },
          { id: "fortune", label: "Fortune", kind: "counter", default: 2 },
          { id: "determination", label: "Détermination", kind: "counter", default: 2 },
          { id: "corruption", label: "Corruption", kind: "counter", default: 0 },
          {
            id: "competences",
            label: "Compétences",
            kind: "list",
            columns: [
              { id: "nom", label: "Compétence", type: "text" },
              { id: "niveau", label: "Niveau", type: "number" },
            ],
          },
          {
            id: "armes",
            label: "Armes",
            kind: "ability",
            columns: [
              { id: "nom", label: "Arme", type: "tag", targetCategory: "Objets" },
              { id: "degats", label: "Dégâts", type: "number" },
              { id: "atouts", label: "Atouts", type: "text" },
            ],
          },
          {
            id: "equipement",
            label: "Équipement",
            kind: "inventory",
            columns: [
              { id: "objet", label: "Objet", type: "tag", targetCategory: "Objets" },
              { id: "quantite", label: "Qté", type: "number" },
              { id: "equipe", label: "Équipé", type: "toggle" },
            ],
          },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    { name: "Corps à corps", kind: "skill", description: "Mêlée et armes de contact." },
    { name: "Tir", kind: "skill", description: "Armes à distance et poudre noire." },
    { name: "Sang-froid", kind: "skill", description: "Résister à la peur et aux horreurs." },
    { name: "Intuition", kind: "skill", description: "Lire les gens et les situations." },
    {
      name: "Coup puissant",
      kind: "trait",
      description: "Ajoute un dé de dégâts avec une arme lourde, au prix d'une action.",
    },
  ],
  lore: [
    {
      title: "Règles essentielles — Warhammer FRPG 4e",
      folder: "Règles",
      contentHtml:
        "<p>Un test = d100 sous la caractéristique (ou la compétence) ; le résultat donne des Niveaux de Succès (SL).</p>" +
        "<ul>" +
        "<li><strong>SL</strong> : dizaines du seuil − dizaines du jet. Une réussite positive vaut autant de niveaux que la différence.</li>" +
        "<li><strong>Avantage</strong> : +10 par point accumulé lors de tests réussis ; s'annule quand on est touché.</li>" +
        "<li><strong>Caractéristiques secondaires</strong> : Bonus de Force, bonus d’armure, Mouvement, Points de Foi.</li>" +
        "<li><strong>Destin</strong> : dépensé pour survivre à une mort certaine ; jamais récupéré.</li>" +
        "<li><strong>Résilience</strong> : encaisse le stress mental et les mutations ; remise à zéro après un repos long.</li>" +
        "<li><strong>Corruption</strong> : au-delà de la valeur de Sociabilité, elle provoque des mutations.</li>" +
        "</ul>",
    },
    {
      title: "Vieux-Noirmont",
      folder: "Lieux",
      contentHtml:
        "<p>Bourgade de brume au pied d'une chaussée naine. Les patrouilleurs n'y vont plus depuis la fermeture de la mine. [[Sœur Adelheid]] tient l'hospice et recueille les témoins.</p>",
    },
    {
      title: "Sœur Adelheid",
      folder: "Personnages",
      gmOnly: true,
      contentHtml:
        "<p>Prêtresse de l'hospice du [[Vieux-Noirmont]]. Elle sait ce qui est remonté de la mine et protège les personnages tant qu'ils ne touchent pas au puits. Sa foi vacille : la Corruption la gagne après chaque nuit de veille.</p>",
    },
  ],
  handouts: [
    {
      title: "Avis de recrutement des patrouilleurs",
      shared: true,
      content:
        "La châtellenie du Vieux-Noirmont recherche des volontaires pour rouvrir la route de la mine. Solde de 5 pistoles d'argent, prime si la chose qui rôde est abattue. Présentez-vous à l'hospice.",
    },
  ],
  pregens: [
    {
      title: "Gunther le Pâle",
      template: "Aventurier WFRP 4e",
      content: "Patrouilleur de [[Vieux-Noirmont]], il doit sa survie à [[Sœur Adelheid]].",
      folder: "Personnages",
      data: {
        nom: "Gunther le Pâle",
        espece: "humain",
        carriere: "Patrouilleur",
        statut: "laiton",
        cc: 38,
        ct: 32,
        force: 34,
        endurance: 36,
        initiative: 31,
        agilite: 33,
        dexterite: 30,
        intelligence: 29,
        fm: 28,
        soc: 30,
        blessures: 13,
        destin: 2,
        resilience: 2,
        fortune: 2,
        determination: 2,
        corruption: 0,
        competences: [
          { nom: "Corps à corps", niveau: 10 },
          { nom: "Sang-froid", niveau: 5 },
        ],
        armes: [{ nom: "Épée", degats: 4, atouts: "Polyvalente" }],
        equipement: [
          { objet: "Épée", quantite: 1, equipe: true },
          { objet: "Gambison", quantite: 1, equipe: true },
          { objet: "Lanterne", quantite: 1, equipe: false },
        ],
        notes:
          "Patrouilleur revenu de la mine sans son équipe. Il ne parle pas de ce qu'il y a vu.",
      },
    },
  ],
  scene: {
    tokens: [
      { name: "Gunther le Pâle", hp: 13, hpMax: 13, ac: null, color: "#c2410c" },
      { name: "Chose du puits", hp: 16, hpMax: 16, ac: null, color: "#475569" },
    ],
  },
};

/** Presets officiels du hub (isPreset = true en base). */
export const PRESET_GAME_SYSTEMS: readonly GameSystemPreset[] = [
  dnd5e,
  cocth,
  cyberpunk,
  chroniques,
  pathfinder2e,
  warhammer,
];

export const PRESET_GAME_SYSTEM_IDS = PRESET_GAME_SYSTEMS.map((preset) => preset.id) as [
  string,
  ...string[],
];

export function getPresetGameSystem(id: string): GameSystemPreset | undefined {
  return PRESET_GAME_SYSTEMS.find((preset) => preset.id === id);
}

/** Visibilité d'une campagne (assistant de création). */
export const campaignVisibilitySchema = z.enum(["private", "public"]);
export type CampaignVisibility = z.infer<typeof campaignVisibilitySchema>;

/** Création de campagne via l'assistant : champs d'identité + système choisi. */
export const createCampaignWithSystemSchema = createCampaignSchema.extend({
  description: z.string().trim().max(2_000).optional(),
  visibility: campaignVisibilitySchema.default("private"),
  // Preset (id stable) ou système homebrew (uuid) — l'appartenance est
  // revérifiée côté serveur avant toute écriture.
  gameSystemId: z.union([z.uuid(), z.enum(PRESET_GAME_SYSTEM_IDS)]).optional(),
});
export type CreateCampaignWithSystemInput = z.infer<typeof createCampaignWithSystemSchema>;
