"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GameModal } from "@/components/game-modal";
import { saveTemplateAsSystemPreset } from "@/features/game-systems/actions";
import type { GameSystemOption } from "@/features/game-systems/systems";
import type { WikiTemplateMeta } from "../types";

interface Props {
  campaignId: string;
  template: WikiTemplateMeta;
  systems: GameSystemOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Enregistre le modèle ouvert comme preset réutilisable d'un système homebrew. */
export function SavePresetModal({ campaignId, template, systems, onClose, onSaved }: Props) {
  const router = useRouter();
  const [systemId, setSystemId] = useState(systems[0]?.id ?? "");
  const [name, setName] = useState(template.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!systemId || !name.trim()) return;
    setSaving(true);
    const res = await saveTemplateAsSystemPreset(campaignId, template.id, { systemId, name });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved(
      res.replaced
        ? `Preset « ${name.trim()} » mis à jour dans le système.`
        : `Preset « ${name.trim()} » ajouté au système.`,
    );
    router.refresh();
    onClose();
  };

  return (
    <GameModal open onClose={onClose} label={`Enregistrer « ${template.name} » comme preset`}>
      <div className="flex flex-col gap-3">
        {systems.length === 0 ? (
          <p className="text-xs text-muted">
            Aucun système homebrew. Créez-en un depuis le tableau de bord pour y ranger vos presets.
          </p>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Système de jeu
              <select
                className="input h-9 px-2.5 py-0 text-sm text-foreground"
                value={systemId}
                onChange={(e) => setSystemId(e.target.value)}
              >
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Nom du preset
              <input
                className="input h-9 px-2.5 py-0 text-sm text-foreground"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <p className="text-xs text-muted">
              Un preset de même nom est remplacé. Le style du modèle est conservé.
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn px-3 py-1.5 text-xs" onClick={onClose}>
                Annuler
              </button>
              <button
                type="button"
                className="btn bg-accent px-3 py-1.5 text-xs text-background"
                disabled={saving || !systemId || !name.trim()}
                onClick={() => void save()}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </>
        )}
        {systems.length === 0 && (
          <div className="flex justify-end">
            <button type="button" className="btn px-3 py-1.5 text-xs" onClick={onClose}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </GameModal>
  );
}
