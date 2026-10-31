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
  schema: TemplateSchema;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "fiche_joueur",
    name: "Fiche joueur",
    category: "Personnages",
    description: "Fiche de personnage joueur : caractéristiques, PV, allié et CSS.",
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
        {
          id: "css",
          label: "CSS personnalisé",
          kind: "css",
          default: ".template-form { border: 1px solid crimson; }",
        },
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
          kind: "list",
          columns: [
            { id: "objet", label: "Objet", type: "text" },
            { id: "quantite", label: "Quantité", type: "number" },
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
];
