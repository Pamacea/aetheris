/**
 * États de jeu de rôle applicables à un jeton VTT.
 * IDs stables en anglais (persistés), libellés français pour l'UI,
 * `short` = abréviation compacte des pastilles sur la table.
 */
export const TOKEN_CONDITIONS = [
  { id: "blinded", label: "Aveuglé", short: "Av" },
  { id: "charmed", label: "Charmé", short: "Ch" },
  { id: "deafened", label: "Assourdi", short: "As" },
  { id: "frightened", label: "Effrayé", short: "Ef" },
  { id: "grappled", label: "Agrippé", short: "Ag" },
  { id: "incapacitated", label: "Neutralisé", short: "Ne" },
  { id: "invisible", label: "Invisible", short: "In" },
  { id: "paralyzed", label: "Paralysé", short: "Pa" },
  { id: "petrified", label: "Pétrifié", short: "Pé" },
  { id: "poisoned", label: "Empoisonné", short: "Em" },
  { id: "prone", label: "À terre", short: "AT" },
  { id: "restrained", label: "Entravé", short: "En" },
  { id: "stunned", label: "Étourdi", short: "Ét" },
  { id: "unconscious", label: "Inconscient", short: "Ic" },
] as const;

export type TokenCondition = (typeof TOKEN_CONDITIONS)[number]["id"];
