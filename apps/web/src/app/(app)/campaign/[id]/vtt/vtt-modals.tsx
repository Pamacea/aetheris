"use client";

import { useState } from "react";
import {
  EMPTY_AMBIANCE_STATE,
  EMPTY_COMBAT_STATE,
  type AmbianceState,
  type CombatState,
  type Playlist,
} from "@aetheris/shared";
import { GameModal } from "@/components/game-modal";
import { canViewModule } from "@/lib/grants";
import { CombatApp } from "../combat/combat-app";
import { AmbianceApp } from "../ambiance/ambiance-app";
import { MacroEditor } from "../../../builder/macro-editor";

/**
 * Modales Combat / Ambiance / Macros ouvertes depuis la tool bar VTT (W4).
 * Gating : plugin dans `campaign.enabledPlugins` + `canViewModule` (grants,
 * MJ toujours autorisé) — mêmes conditions que le fetch des états initiaux
 * dans `page.tsx`.
 */
type ModalId = "combat" | "ambiance" | "macros";

export interface VttModalsProps {
  campaignId: string;
  isGM: boolean;
  /** `Campaign.enabledPlugins` — bouton absent si le plugin est désactivé. */
  enabledPlugins: string[];
  /** Grants du membre (`CampaignMember.permissions`). */
  permissions: unknown;
  /** Fetchis par la page uniquement si le plugin est visible. */
  initialCombat: CombatState | null;
  initialAmbiance: { playlists: Playlist[]; state: AmbianceState } | null;
}

const BUTTONS: { id: ModalId; label: string; hint: string }[] = [
  { id: "combat", label: "Combat", hint: "Combat & initiative — sync temps réel" },
  { id: "ambiance", label: "Ambiance", hint: "Playlists audio synchronisées" },
  { id: "macros", label: "Macros", hint: "Constructeur de macros" },
];

export function VttModals({
  campaignId,
  isGM,
  enabledPlugins,
  permissions,
  initialCombat,
  initialAmbiance,
}: VttModalsProps) {
  const [modal, setModal] = useState<ModalId | null>(null);
  const role = isGM ? "GM" : "PLAYER";
  const visible = (id: ModalId) =>
    enabledPlugins.includes(id) && canViewModule(permissions, id, role);
  const close = () => setModal(null);

  return (
    <>
      {BUTTONS.filter((b) => visible(b.id)).map((b) => (
        <button
          key={b.id}
          type="button"
          title={b.hint}
          aria-expanded={modal === b.id}
          onClick={() => setModal((m) => (m === b.id ? null : b.id))}
          className={`btn px-2.5 py-1 text-xs ${
            modal === b.id
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {b.label}
        </button>
      ))}

      <GameModal key="combat" open={modal === "combat"} onClose={close} label="Combat & Initiative">
        <CombatApp
          campaignId={campaignId}
          isGM={isGM}
          initialState={initialCombat ?? EMPTY_COMBAT_STATE}
        />
      </GameModal>
      <GameModal key="ambiance" open={modal === "ambiance"} onClose={close} label="Ambiance sonore">
        <AmbianceApp
          campaignId={campaignId}
          isGM={isGM}
          playlists={initialAmbiance?.playlists ?? []}
          initialState={initialAmbiance?.state ?? EMPTY_AMBIANCE_STATE}
        />
      </GameModal>
      <GameModal
        key="macros"
        open={modal === "macros"}
        onClose={close}
        label="Constructeur de macros"
      >
        <MacroEditor campaignId={campaignId} />
      </GameModal>
    </>
  );
}
