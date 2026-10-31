import type { SystemGenre } from "./game-systems.js";
import type { TemplateSchema } from "./templates.js";

/**
 * Presets de templates poussés (W10) : structures prêtes à l'emploi qu'un MJ
 * charge depuis le builder (création ou remplacement des champs).
 * Le typage `TemplateSchema` (même source que `templateSchemaSchema`) valide
 * chaque champ à la compilation.
 */
export interface TemplatePreset {
  id: string;
  name: string;
  category?: string;
  description?: string;
  /** Genre de jeu : sert à grouper les presets dans le builder. */
  genre?: SystemGenre;
  /** Style propre au modèle, appliqué au rendu de ses fiches. */
  customCss?: string;
  schema: TemplateSchema;
}

/** Colonnes de modificateurs passifs, alignées sur les conventions du moteur. */
const MODIFIER_COLUMNS = [
  { id: "stat", label: "Stat modifiée", type: "text" as const },
  { id: "mod", label: "Bonus", type: "number" as const },
  {
    id: "mod_type",
    label: "Type de bonus",
    type: "select" as const,
    options: [
      { value: "flat", label: "Fixe" },
      { value: "percent", label: "Pourcentage" },
    ],
  },
];

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "fiche_joueur",
    name: "Fiche joueur",
    category: "Personnages",
    description: "Fiche de personnage joueur : caractéristiques, PV et allié.",
    customCss: ".template-form { border: 1px solid crimson; }",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        { id: "race_concept", label: "Race ou concept", kind: "text" },
        { id: "pv", label: "PV", kind: "counter", default: 0, step: 1 },
        { id: "force", label: "Force", kind: "number", decimals: 0, min: 0 },
        { id: "dexterite", label: "Dextérité", kind: "number", decimals: 0, min: 0 },
        { id: "constitution", label: "Constitution", kind: "number", decimals: 0, min: 0 },
        { id: "intelligence", label: "Intelligence", kind: "number", decimals: 0, min: 0 },
        { id: "sagesse", label: "Sagesse", kind: "number", decimals: 0, min: 0 },
        { id: "charisme", label: "Charisme", kind: "number", decimals: 0, min: 0 },
        { id: "notes", label: "Notes", kind: "textarea" },
        { id: "allie", label: "Allié", kind: "tag", targetCategory: "Personnages" },
      ],
    },
  },
  {
    id: "pnj",
    name: "PNJ",
    category: "Personnages",
    description: "Fiche de PNJ : faction, CR ou niveau, résumé calculé en JS.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        {
          id: "type",
          label: "Type",
          kind: "select",
          options: [
            { value: "allie", label: "Allié" },
            { value: "neutre", label: "Neutre" },
            { value: "ennemi", label: "Ennemi" },
          ],
          default: "neutre",
        },
        { id: "cr_niveau", label: "CR ou niveau", kind: "number", decimals: 0, min: 0 },
        { id: "pv", label: "PV", kind: "counter", default: 0, step: 1 },
        { id: "description", label: "Description", kind: "textarea" },
        { id: "factions", label: "Factions", kind: "tag" },
        {
          id: "resume_js",
          label: "Résumé auto (JS)",
          kind: "js",
          default: `return "PV : " + (scope.pv ?? 0);`,
        },
      ],
    },
  },
  {
    id: "personnage",
    name: "Personnage",
    category: "Personnages",
    description: "Fiche de personnage prête à l'emploi : identité, caractéristiques et inventaire.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        { id: "concept", label: "Concept / archétype", kind: "text", default: "Aventurier" },
        { id: "niveau", label: "Niveau", kind: "number", decimals: 0, min: 1, default: 1 },
        { id: "pv", label: "Points de vie", kind: "counter", default: 10, step: 1 },
        { id: "force", label: "Force", kind: "number", decimals: 0, min: 0, default: 10 },
        { id: "dexterite", label: "Dextérité", kind: "number", decimals: 0, min: 0, default: 10 },
        {
          id: "constitution",
          label: "Constitution",
          kind: "number",
          decimals: 0,
          min: 0,
          default: 10,
        },
        {
          id: "intelligence",
          label: "Intelligence",
          kind: "number",
          decimals: 0,
          min: 0,
          default: 10,
        },
        { id: "sagesse", label: "Sagesse", kind: "number", decimals: 0, min: 0, default: 10 },
        { id: "charisme", label: "Charisme", kind: "number", decimals: 0, min: 0, default: 10 },
        { id: "description", label: "Description", kind: "textarea" },
        {
          id: "inventaire",
          label: "Inventaire",
          kind: "inventory",
          columns: [
            // Colonne lien : les objets s'ajoutent en glissant une fiche du wiki.
            { id: "objet", label: "Objet", type: "tag" },
            { id: "quantite", label: "Quantité", type: "number" },
            { id: "poids", label: "Poids", type: "number" },
          ],
        },
        { id: "allie", label: "Allié", kind: "tag", targetCategory: "Personnages" },
        { id: "portrait", label: "Portrait", kind: "image" },
      ],
    },
  },
  {
    id: "lieu",
    name: "Lieu",
    category: "Lieux",
    description: "Fiche de lieu : type, région, population, habitants et dangers.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        {
          id: "type",
          label: "Type de lieu",
          kind: "select",
          options: [
            { value: "ville", label: "Ville" },
            { value: "village", label: "Village" },
            { value: "foret", label: "Forêt" },
            { value: "montagne", label: "Montagne" },
            { value: "donjon", label: "Donjon" },
            { value: "ruine", label: "Ruine" },
            { value: "plan", label: "Plan" },
          ],
          default: "ville",
        },
        { id: "region", label: "Région", kind: "text" },
        { id: "population", label: "Population", kind: "number", decimals: 0, min: 0, default: 0 },
        { id: "description", label: "Description", kind: "textarea" },
        { id: "habitants", label: "Habitants", kind: "tag", targetCategory: "Personnages" },
        { id: "dangers", label: "Dangers", kind: "textarea" },
        { id: "image", label: "Illustration", kind: "image" },
      ],
    },
  },
  {
    id: "objet_magique",
    name: "Objet magique",
    category: "Objets",
    description: "Fiche d'objet magique : type, rareté, charges, effet et propriétaire.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        {
          id: "type",
          label: "Type d'objet",
          kind: "select",
          options: [
            { value: "arme", label: "Arme" },
            { value: "armure", label: "Armure" },
            { value: "potion", label: "Potion" },
            { value: "parchemin", label: "Parchemin" },
            { value: "bijou", label: "Bijou" },
            { value: "artefact", label: "Artefact" },
          ],
          default: "arme",
        },
        {
          id: "rarete",
          label: "Rareté",
          kind: "select",
          options: [
            { value: "commun", label: "Commun" },
            { value: "peu_commun", label: "Peu commun" },
            { value: "rare", label: "Rare" },
            { value: "tres_rare", label: "Très rare" },
            { value: "legendaire", label: "Légendaire" },
          ],
          default: "commun",
        },
        { id: "charges", label: "Charges", kind: "counter", default: 3, step: 1, max: 50 },
        {
          id: "harmonisation",
          label: "Harmonisation requise",
          kind: "toggle",
          default: false,
        },
        { id: "effet", label: "Effet", kind: "textarea" },
        { id: "malediction", label: "Malédiction", kind: "textarea" },
        {
          id: "proprietaire",
          label: "Propriétaire",
          kind: "tag",
          targetCategory: "Personnages",
        },
        { id: "histoire", label: "Histoire", kind: "textarea" },
        { id: "image", label: "Illustration", kind: "image" },
      ],
    },
  },
  {
    id: "bestiaire",
    name: "Bestiaire",
    category: "Créatures",
    description: "Fiche de créature : espèce, environnement, taille et PV.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        { id: "espece", label: "Espèce", kind: "text" },
        {
          id: "environnement",
          label: "Environnement",
          kind: "select",
          options: [
            { value: "foret", label: "Forêt" },
            { value: "montagne", label: "Montagne" },
            { value: "cite", label: "Cité" },
            { value: "ocean", label: "Océan" },
            { value: "sous_sol", label: "Sous-sol" },
          ],
        },
        {
          id: "taille",
          label: "Taille",
          kind: "select",
          options: [
            { value: "tres_petite", label: "Très petite" },
            { value: "petite", label: "Petite" },
            { value: "moyenne", label: "Moyenne" },
            { value: "grande", label: "Grande" },
            { value: "tres_grande", label: "Très grande" },
            { value: "colossale", label: "Colossale" },
          ],
          default: "moyenne",
        },
        { id: "pv", label: "PV", kind: "counter", default: 0, step: 1 },
        { id: "description", label: "Description", kind: "textarea" },
      ],
    },
  },

  // --- Science-fiction / Cyberpunk ---
  {
    id: "cyber_personnage",
    name: "Personnage cyberpunk",
    category: "Personnages",
    genre: "sci-fi",
    description: "Attributs, humanité, implants modifiant les stats et cyberpsychose.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        { id: "role", label: "Rôle", kind: "text", default: "Mercenaire" },
        { id: "pv", label: "PV", kind: "counter", default: 15, step: 1 },
        { id: "humanite", label: "Humanité", kind: "counter", default: 40, step: 1 },
        { id: "credits", label: "Crédits", kind: "counter", default: 0, step: 1 },
        { id: "corps", label: "Corps", kind: "number", decimals: 0, default: 5 },
        { id: "reflexes", label: "Réflexes", kind: "number", decimals: 0, default: 5 },
        { id: "tech", label: "Tech", kind: "number", decimals: 0, default: 5 },
        { id: "sang_froid", label: "Sang-froid", kind: "number", decimals: 0, default: 5 },
        {
          id: "implants",
          label: "Implants",
          kind: "inventory",
          columns: [
            { id: "nom", label: "Implant", type: "text" },
            { id: "equipe", label: "Actif", type: "toggle" },
            ...MODIFIER_COLUMNS,
          ],
        },
        { id: "cyberpsychose", label: "Cyberpsychose", kind: "counter", default: 0, step: 1 },
        { id: "notes", label: "Notes", kind: "textarea" },
      ],
    },
  },
  {
    id: "intrusion",
    name: "Programme d'intrusion",
    category: "Programmes",
    genre: "sci-fi",
    description: "Routines d'un deck : coût, formule de dégâts et modificateurs.",
    schema: {
      fields: [
        { id: "nom", label: "Nom du programme", kind: "text" },
        {
          id: "type",
          label: "Type",
          kind: "select",
          options: [
            { value: "attaque", label: "Attaque" },
            { value: "defense", label: "Défense" },
            { value: "utilitaire", label: "Utilitaire" },
            { value: "daemon", label: "Daemon" },
          ],
          default: "attaque",
        },
        { id: "niveau", label: "Niveau", kind: "number", decimals: 0, min: 1, default: 1 },
        { id: "cout", label: "Coût en charge", kind: "counter", default: 1, step: 1 },
        {
          id: "routines",
          label: "Routines",
          kind: "ability",
          columns: [
            { id: "nom", label: "Routine", type: "text" },
            { id: "cout", label: "Coût", type: "number" },
            { id: "degats", label: "Dégâts", type: "formula" },
            { id: "actif", label: "Actif", type: "toggle" },
            ...MODIFIER_COLUMNS,
          ],
        },
        { id: "description", label: "Description", kind: "textarea" },
      ],
    },
  },
  {
    id: "vehicule",
    name: "Véhicule",
    category: "Véhicules",
    genre: "sci-fi",
    description: "Intégrité, blindage, vitesse et équipement embarqué.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        { id: "modele", label: "Modèle", kind: "text" },
        {
          id: "type",
          label: "Type",
          kind: "select",
          options: [
            { value: "moto", label: "Moto" },
            { value: "voiture", label: "Voiture" },
            { value: "aeronef", label: "Aéronef" },
            { value: "navire", label: "Navire" },
          ],
          default: "voiture",
        },
        { id: "blindage", label: "Blindage", kind: "number", decimals: 0, min: 0, default: 0 },
        { id: "integrite", label: "Intégrité", kind: "counter", default: 20, step: 1 },
        { id: "vitesse", label: "Vitesse", kind: "number", decimals: 0, min: 0, default: 0 },
        {
          id: "equipement",
          label: "Équipement",
          kind: "list",
          columns: [
            { id: "objet", label: "Équipement", type: "text" },
            { id: "quantite", label: "Quantité", type: "number" },
          ],
        },
        { id: "notes", label: "Notes", kind: "textarea" },
      ],
    },
  },

  // --- Fantasy sombre ---
  {
    id: "personnage_dark",
    name: "Personnage dark fantasy",
    category: "Personnages",
    genre: "fantasy",
    description: "Santé mentale, corruption, sorts et équipement modifiant les stats.",
    customCss: ".template-form { background: #120e0b; }",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        { id: "origine", label: "Origine", kind: "text" },
        { id: "pv", label: "PV", kind: "counter", default: 10, step: 1 },
        { id: "sante_mentale", label: "Santé mentale", kind: "counter", default: 10, step: 1 },
        { id: "corruption", label: "Corruption", kind: "counter", default: 0, step: 1, max: 10 },
        { id: "force", label: "Force", kind: "number", decimals: 0, default: 10 },
        { id: "dexterite", label: "Dextérité", kind: "number", decimals: 0, default: 10 },
        { id: "volonte", label: "Volonté", kind: "number", decimals: 0, default: 10 },
        {
          id: "sorts",
          label: "Sorts",
          kind: "ability",
          columns: [
            { id: "nom", label: "Sort", type: "text" },
            { id: "cout", label: "Coût", type: "number" },
            { id: "recharge", label: "Recharge", type: "text" },
            { id: "degats", label: "Dégâts / soin", type: "formula" },
            { id: "actif", label: "Actif", type: "toggle" },
            ...MODIFIER_COLUMNS,
          ],
        },
        {
          id: "equipement",
          label: "Équipement",
          kind: "inventory",
          columns: [
            { id: "nom", label: "Objet", type: "text" },
            { id: "equipe", label: "Équipé", type: "toggle" },
            ...MODIFIER_COLUMNS,
          ],
        },
        { id: "notes", label: "Notes", kind: "textarea" },
      ],
    },
  },
  {
    id: "creature_maudite",
    name: "Créature maudite",
    category: "Créatures",
    genre: "fantasy",
    description: "Menace, faiblesse et capacités avec formule de dégâts.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        { id: "espece", label: "Espèce", kind: "text" },
        {
          id: "menace",
          label: "Niveau de menace",
          kind: "select",
          options: [
            { value: "mineure", label: "Mineure" },
            { value: "moderee", label: "Modérée" },
            { value: "majeure", label: "Majeure" },
            { value: "mortelle", label: "Mortelle" },
          ],
          default: "moderee",
        },
        { id: "pv", label: "PV", kind: "counter", default: 20, step: 1 },
        { id: "faiblesse", label: "Faiblesse", kind: "text" },
        {
          id: "capacites",
          label: "Capacités",
          kind: "ability",
          columns: [
            { id: "nom", label: "Capacité", type: "text" },
            { id: "degats", label: "Dégâts", type: "formula" },
            { id: "actif", label: "Active", type: "toggle" },
          ],
        },
        { id: "description", label: "Description", kind: "textarea" },
      ],
    },
  },
  {
    id: "artefact_maudit",
    name: "Artefact maudit",
    category: "Objets",
    genre: "fantasy",
    description: "Objet à charges : effet, malédiction et porteur.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        {
          id: "rarete",
          label: "Rareté",
          kind: "select",
          options: [
            { value: "rare", label: "Rare" },
            { value: "tres_rare", label: "Très rare" },
            { value: "legendaire", label: "Légendaire" },
            { value: "unique", label: "Unique" },
          ],
          default: "rare",
        },
        { id: "charges", label: "Charges", kind: "counter", default: 1, step: 1, max: 20 },
        { id: "effet", label: "Effet", kind: "textarea" },
        { id: "malediction", label: "Malédiction", kind: "textarea" },
        { id: "porteur", label: "Porteur", kind: "tag", targetCategory: "Personnages" },
        { id: "image", label: "Illustration", kind: "image" },
      ],
    },
  },

  // --- Enquête / Horreur contemporaine ---
  {
    id: "investigateur",
    name: "Investigateur",
    category: "Personnages",
    genre: "horreur",
    description: "Santé mentale, compétences d'enquête et carnet d'indices.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        { id: "occupation", label: "Occupation", kind: "text" },
        { id: "pv", label: "PV", kind: "counter", default: 10, step: 1 },
        { id: "sante_mentale", label: "Santé mentale", kind: "counter", default: 50, step: 1 },
        { id: "sang_froid", label: "Sang-froid", kind: "number", decimals: 0, default: 50 },
        { id: "perception", label: "Perception", kind: "number", decimals: 0, default: 50 },
        {
          id: "indices",
          label: "Indices",
          kind: "list",
          columns: [
            { id: "indice", label: "Indice", type: "text" },
            { id: "source", label: "Source", type: "text" },
          ],
        },
        { id: "notes", label: "Notes", kind: "textarea" },
      ],
    },
  },
  {
    id: "indice",
    name: "Indice ou preuve",
    category: "Enquête",
    genre: "horreur",
    description: "Pièce à conviction : type, lieu, fiabilité.",
    schema: {
      fields: [
        { id: "nom", label: "Intitulé", kind: "text" },
        {
          id: "type",
          label: "Type",
          kind: "select",
          options: [
            { value: "temoin", label: "Témoignage" },
            { value: "document", label: "Document" },
            { value: "objet", label: "Objet" },
            { value: "trace", label: "Trace" },
          ],
          default: "document",
        },
        { id: "lieu", label: "Lieu", kind: "tag", targetCategory: "Lieux" },
        {
          id: "fiabilite",
          label: "Fiabilité",
          kind: "select",
          options: [
            { value: "certaine", label: "Certaine" },
            { value: "probable", label: "Probable" },
            { value: "douteuse", label: "Douteuse" },
          ],
          default: "probable",
        },
        { id: "description", label: "Description", kind: "textarea" },
        { id: "image", label: "Illustration", kind: "image" },
      ],
    },
  },

  // --- Super-héros / Pulp ---
  {
    id: "super_heros",
    name: "Super-héros",
    category: "Personnages",
    genre: "autre",
    description: "Identité secrète, pouvoirs modifiant les stats et faiblesse.",
    schema: {
      fields: [
        { id: "nom", label: "Nom de code", kind: "text" },
        { id: "identite_secrete", label: "Identité secrète", kind: "text" },
        { id: "pv", label: "PV", kind: "counter", default: 20, step: 1 },
        { id: "puissance", label: "Puissance", kind: "number", decimals: 0, default: 10 },
        {
          id: "pouvoirs",
          label: "Pouvoirs",
          kind: "ability",
          columns: [
            { id: "nom", label: "Pouvoir", type: "text" },
            { id: "cout", label: "Coût", type: "number" },
            { id: "degats", label: "Effet chiffré", type: "formula" },
            { id: "actif", label: "Actif", type: "toggle" },
            ...MODIFIER_COLUMNS,
          ],
        },
        { id: "faiblesse", label: "Faiblesse", kind: "text" },
        { id: "reputation", label: "Réputation", kind: "counter", default: 0, step: 1 },
        { id: "description", label: "Description", kind: "textarea" },
      ],
    },
  },
  {
    id: "vilain",
    name: "Vilain",
    category: "Personnages",
    genre: "autre",
    description: "Plan machiavélique, pouvoirs et organisation de rattachement.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        { id: "alias", label: "Alias", kind: "text" },
        {
          id: "menace",
          label: "Niveau de menace",
          kind: "select",
          options: [
            { value: "sbire", label: "Sbire" },
            { value: "lieutenant", label: "Lieutenant" },
            { value: "archivillain", label: "Archivillain" },
          ],
          default: "lieutenant",
        },
        { id: "pv", label: "PV", kind: "counter", default: 15, step: 1 },
        { id: "plan", label: "Plan", kind: "textarea" },
        {
          id: "pouvoirs",
          label: "Pouvoirs",
          kind: "ability",
          columns: [
            { id: "nom", label: "Pouvoir", type: "text" },
            { id: "degats", label: "Effet chiffré", type: "formula" },
            { id: "actif", label: "Actif", type: "toggle" },
          ],
        },
        { id: "organisation", label: "Organisation", kind: "tag" },
        { id: "description", label: "Description", kind: "textarea" },
      ],
    },
  },

  // --- Narratif ---
  {
    id: "personnage_narratif",
    name: "Personnage narratif",
    category: "Personnages",
    genre: "narratif",
    description: "Sans statistiques : concept, aspects et liens entre personnages.",
    schema: {
      fields: [
        { id: "nom", label: "Nom", kind: "text" },
        { id: "concept", label: "Concept", kind: "text" },
        { id: "aspects", label: "Aspects", kind: "textarea" },
        {
          id: "liens",
          label: "Liens",
          kind: "list",
          columns: [
            { id: "nom", label: "Personnage", type: "text" },
            { id: "relation", label: "Relation", type: "text" },
          ],
        },
        { id: "notes", label: "Notes", kind: "textarea" },
        { id: "portrait", label: "Portrait", kind: "image" },
      ],
    },
  },
  {
    id: "relation",
    name: "Relation",
    category: "Narratif",
    genre: "narratif",
    description: "Lien entre deux personnages : nature, intensité et évolution.",
    schema: {
      fields: [
        { id: "nom", label: "Intitulé", kind: "text" },
        {
          id: "nature",
          label: "Nature",
          kind: "select",
          options: [
            { value: "alliance", label: "Alliance" },
            { value: "rivalite", label: "Rivalité" },
            { value: "amour", label: "Amour" },
            { value: "dette", label: "Dette" },
            { value: "famille", label: "Famille" },
          ],
          default: "alliance",
        },
        { id: "intensite", label: "Intensité", kind: "counter", default: 1, step: 1, max: 5 },
        { id: "description", label: "Description", kind: "textarea" },
      ],
    },
  },
];
