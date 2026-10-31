"use client";

/**
 * Export PDF sans dépendance : impression navigateur + « Enregistrer au format PDF ».
 * (Aucune librairie PDF n'est installée — ne pas en ajouter pour ce bouton.)
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn fixed top-20 right-4 z-50 px-3 py-1.5 text-[0.65rem] tracking-widest uppercase print:hidden"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}
