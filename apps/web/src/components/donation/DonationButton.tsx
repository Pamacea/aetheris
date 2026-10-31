"use client";

import { useState } from "react";
import { DonationModal } from "./DonationModal";

/** Bouton d'ouverture de la modale de don (navbar, landing, menu profil). */
export function DonationButton({
  className,
  label = "Soutenir Aetheris",
}: {
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <DonationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
