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
            kind: "list",
            columns: [
              { id: "nom", label: "Compétence", type: "text" },
              { id: "bonus", label: "Bonus", type: "number" },
            ],
          },
          {
            id: "sorts",
            label: "Sorts",
            kind: "list",
            columns: [
              { id: "nom", label: "Sort", type: "text" },
              { id: "niveau", label: "Niveau", type: "number" },
              { id: "effet", label: "Effet", type: "text" },
            ],
          },
          {
            id: "equipement",
            label: "Équipement",
            kind: "list",
            columns: [
              { id: "objet", label: "Objet", type: "text" },
              { id: "quantite", label: "Quantité", type: "number" },
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
};

const cocth: GameSystemPreset = {
  id: "cocth",
  name: "L'Appel de Cthulhu",
  description: "Horreur cosmique : compétences, santé mentale et enquête.",
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
          { id: "pv", label: "Points de vie", kind: "counter", default: 10, step: 1 },
          {
            id: "competences",
            label: "Compétences",
            kind: "list",
            columns: [
              { id: "nom", label: "Compétence", type: "text" },
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
};

const alien: GameSystemPreset = {
  id: "alien",
  name: "Alien RPG",
  description: "Science-fiction horrifique : stress, santé et spécialités coloniales.",
  genre: "sci-fi",
  templates: [
    {
      name: "Colonial Marine",
      category: "Personnages",
      description: "Fiche de marine : attributs, santé, stress et talents.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          {
            id: "specialite",
            label: "Spécialité",
            kind: "select",
            options: [
              { value: "marine", label: "Marine colonial" },
              { value: "officier", label: "Officier" },
              { value: "pilote", label: "Pilote" },
              { value: "medecin", label: "Médecin" },
              { value: "technicien", label: "Technicien" },
            ],
            default: "marine",
          },
          { id: "force", label: "Force", kind: "number", decimals: 0, default: 3 },
          { id: "agilite", label: "Agilité", kind: "number", decimals: 0, default: 3 },
          { id: "esprit", label: "Esprit", kind: "number", decimals: 0, default: 3 },
          { id: "empathie", label: "Empathie", kind: "number", decimals: 0, default: 3 },
          { id: "sante", label: "Santé", kind: "counter", default: 4, step: 1 },
          { id: "stress", label: "Stress", kind: "counter", default: 0, step: 1 },
          {
            id: "talents",
            label: "Talents",
            kind: "list",
            columns: [
              { id: "nom", label: "Talent", type: "text" },
              { id: "niveau", label: "Niveau", type: "number" },
            ],
          },
          {
            id: "equipement",
            label: "Équipement",
            kind: "list",
            columns: [
              { id: "objet", label: "Objet", type: "text" },
              { id: "quantite", label: "Quantité", type: "number" },
            ],
          },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    { name: "Tir", kind: "skill", description: "Armes à feu et armes lourdes." },
    { name: "Pilotage", kind: "skill", description: "Vaisseaux et véhicules." },
    { name: "Médical", kind: "skill", description: "Soins d'urgence et diagnostics." },
    { name: "Survie", kind: "skill", description: "Environnements hostiles." },
    { name: "Bravoure", kind: "trait", description: "Réduit le stress en situation critique." },
  ],
};

const narrative: GameSystemPreset = {
  id: "narrative",
  name: "Sans Système / Narratif",
  description: "Fiche légère : concept, aspects et traits, sans jets de dés imposés.",
  genre: "narratif",
  templates: [
    {
      name: "Personnage narratif",
      category: "Personnages",
      description: "Identité, concept, aspects et traits libres.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          { id: "concept", label: "Concept", kind: "text" },
          {
            id: "aspects",
            label: "Aspects",
            kind: "list",
            columns: [
              { id: "aspect", label: "Aspect", type: "text" },
              { id: "type", label: "Type", type: "text" },
            ],
          },
          { id: "traits", label: "Traits", kind: "textarea" },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    { name: "Passion", kind: "trait", description: "Ce qui motive le personnage." },
    { name: "Secret", kind: "trait", description: "Une vérité cachée, source de tension." },
    { name: "Dette", kind: "trait", description: "Une obligation envers quelqu'un." },
    { name: "Origine", kind: "trait", description: "D'où vient le personnage." },
  ],
};

const cyberpunk: GameSystemPreset = {
  id: "cyberpunk",
  name: "Cyberpunk",
  description: "Runner : attributs, humanité, cyberware et équipement de rue.",
  genre: "cyberpunk",
  templates: [
    {
      name: "Runner",
      category: "Personnages",
      description: "Attributs, PV, humanité, implants et inventaire.",
      schema: {
        fields: [
          { id: "nom", label: "Nom / handle", kind: "text" },
          { id: "role", label: "Rôle", kind: "text" },
          { id: "reflexes", label: "Réflexes", kind: "counter" },
          { id: "intellect", label: "Intellect", kind: "counter" },
          { id: "technique", label: "Technique", kind: "counter" },
          { id: "pv", label: "PV", kind: "counter" },
          { id: "humanite", label: "Humanité", kind: "counter" },
          {
            id: "cyberware",
            label: "Cyberware",
            kind: "list",
            columns: [
              { id: "implant", label: "Implant", type: "text" },
              { id: "effet", label: "Effet", type: "text" },
              { id: "cout", label: "Coût humanité", type: "number" },
            ],
          },
          {
            id: "equipement",
            label: "Équipement",
            kind: "inventory",
            columns: [
              { id: "objet", label: "Objet", type: "text" },
              { id: "quantite", label: "Quantité", type: "number" },
            ],
          },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    { name: "Piratage", kind: "skill", description: "Intrusion dans les réseaux et implants." },
    { name: "Armes à feu", kind: "skill", description: "Pistolets, fusils et armes lourdes." },
    { name: "Discrétion", kind: "skill", description: "Se fondre dans la foule ou les ombres." },
    { name: "Négociation", kind: "skill", description: "Obtenir un prix, un accès ou une faveur." },
    {
      name: "Implant militaire",
      kind: "item",
      description: "Prothèse offensive de grade militaire.",
    },
  ],
};

const darkFantasy: GameSystemPreset = {
  id: "dark-fantasy",
  name: "Dark Fantasy",
  description: "Fiche sombre : vigueur, corruption, sorts et équipement maudit.",
  genre: "fantasy",
  templates: [
    {
      name: "Âme damnée",
      category: "Personnages",
      description: "Vigueur, corruption, sorts et inventaire.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          { id: "origine", label: "Origine", kind: "text" },
          { id: "vigueur", label: "Vigueur", kind: "counter" },
          { id: "agilite", label: "Agilité", kind: "counter" },
          { id: "volonte", label: "Volonté", kind: "counter" },
          { id: "pv", label: "PV", kind: "counter" },
          { id: "corruption", label: "Corruption", kind: "counter" },
          {
            id: "sorts",
            label: "Sorts",
            kind: "list",
            columns: [
              { id: "sort", label: "Sort", type: "text" },
              { id: "cout", label: "Coût", type: "number" },
              { id: "effet", label: "Effet", type: "text" },
            ],
          },
          {
            id: "equipement",
            label: "Équipement",
            kind: "inventory",
            columns: [
              { id: "objet", label: "Objet", type: "text" },
              { id: "quantite", label: "Quantité", type: "number" },
            ],
          },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    { name: "Occultisme", kind: "skill", description: "Déchiffrer rituels et grimoires." },
    { name: "Athlétisme", kind: "skill", description: "Endurance, escalade, course." },
    { name: "Intimidation", kind: "skill", description: "Imposer sa volonté par la peur." },
    { name: "Braises", kind: "spell", description: "Projette une flamme qui ronge l'âme." },
    {
      name: "Serment noir",
      kind: "trait",
      description: "Pacte qui accorde du pouvoir contre de la corruption.",
    },
  ],
};

const investigation: GameSystemPreset = {
  id: "enquete",
  name: "Enquête",
  description: "Enquêteur : compétences d'observation, indices, contacts et déductions.",
  genre: "enquete",
  templates: [
    {
      name: "Enquêteur",
      category: "Personnages",
      description: "Compétences, santé mentale, indices et contacts.",
      schema: {
        fields: [
          { id: "nom", label: "Nom", kind: "text" },
          { id: "profession", label: "Profession", kind: "text" },
          { id: "observation", label: "Observation", kind: "counter" },
          { id: "deduction", label: "Déduction", kind: "counter" },
          { id: "sang_froid", label: "Sang-froid", kind: "counter" },
          { id: "sante_mentale", label: "Santé mentale", kind: "counter" },
          {
            id: "indices",
            label: "Indices",
            kind: "list",
            columns: [
              { id: "indice", label: "Indice", type: "text" },
              { id: "lieu", label: "Lieu", type: "text" },
              { id: "statut", label: "Statut", type: "text" },
            ],
          },
          {
            id: "contacts",
            label: "Contacts",
            kind: "list",
            columns: [
              { id: "nom", label: "Nom", type: "text" },
              { id: "role", label: "Rôle", type: "text" },
              { id: "fiable", label: "Fiable", type: "toggle" },
            ],
          },
          { id: "notes", label: "Notes", kind: "textarea" },
        ],
      },
    },
  ],
  assets: [
    { name: "Fouille", kind: "skill", description: "Chercher un indice dans une scène." },
    { name: "Interrogatoire", kind: "skill", description: "Faire parler un témoin ou un suspect." },
    { name: "Filature", kind: "skill", description: "Suivre une cible sans être repéré." },
    {
      name: "Mémoire eidétique",
      kind: "trait",
      description: "Se souvenir du moindre détail observé.",
    },
    { name: "Carnet d'enquête", kind: "item", description: "Notes, croquis et recoupements." },
  ],
};

/** Presets officiels du hub (isPreset = true en base). */
export const PRESET_GAME_SYSTEMS: readonly GameSystemPreset[] = [
  dnd5e,
  cocth,
  alien,
  narrative,
  cyberpunk,
  darkFantasy,
  investigation,
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
