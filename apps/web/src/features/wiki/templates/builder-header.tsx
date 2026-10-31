import { useEffect, useRef, useState } from "react";
import {
  SYSTEM_GENRES,
  TEMPLATE_PRESETS,
  templateFieldSchema,
  type TemplatePreset,
} from "@aetheris/shared";
import { GameModal } from "@/components/game-modal";
import { MenuIcon, PaletteIcon } from "@/components/icons";
import type { WikiTemplateMeta } from "../types";
import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import type { TemplateActions } from "./builder-actions";
import { TemplateForm } from "./template-form";

interface Props {
  st: BuilderState;
  selected: WikiTemplateMeta;
  ops: FieldOps;
  actions: TemplateActions;
  /** Modèles seedés du système de la campagne. */
  systemPresets: TemplatePreset[];
}

/** Presets groupés par genre ; les presets génériques ouvrent la liste. */
const PRESET_GROUPS: Array<{ label: string; presets: TemplatePreset[] }> = [
  { label: "Général", presets: TEMPLATE_PRESETS.filter((p) => !p.genre) },
  ...SYSTEM_GENRES.map((g) => ({
    label: g.label,
    presets: TEMPLATE_PRESETS.filter((p) => p.genre === g.id),
  })),
].filter((g) => g.presets.length > 0);

/** En-tête de l'éditeur : nom, catégorie, presets, statut et suppression. */
export function BuilderHeader({ st, selected, ops, actions, systemPresets }: Props) {
  const { campaignId, categories, status } = st;
  const { patchSelected } = ops;
  const { handleDelete, handlePresetReplace, handleSaveStyle } = actions;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [cssDraft, setCssDraft] = useState("");
  const [styleError, setStyleError] = useState<string | null>(null);
  const [savingStyle, setSavingStyle] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Menu compact : Échap et clic extérieur ferment, le focus revient au bouton.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  // Migration douce : si le modèle n'a pas encore de CSS propre, on reprend le
  // CSS des champs « css » hérités (ils restent appliqués tant qu'on n'enregistre pas).
  const openStyle = () => {
    const legacy = st.fields
      .filter((f) => f.kind === "css")
      .map((f) => (typeof f.default === "string" ? f.default : ""))
      .filter(Boolean)
      .join("\n");
    setStyleError(null);
    setCssDraft(selected.customCss?.trim() ? selected.customCss : legacy);
    setStyleOpen(true);
  };

  const saveStyle = async () => {
    setSavingStyle(true);
    const res = await handleSaveStyle(cssDraft);
    setSavingStyle(false);
    if (res.ok) setStyleOpen(false);
    else setStyleError(res.error ?? "Erreur d’enregistrement.");
  };

  // Schéma courant (non sauvegardé), tolérant comme le builder : les champs
  // encore incomplets sont ignorés pour que l'aperçu s'affiche quand même.
  const previewFields = st.fields
    .flatMap((f) => {
      const parsed = templateFieldSchema.safeParse(f);
      return parsed.success ? [parsed.data] : [];
    })
    .slice(0, 60);

  const statusLabel =
    status === "saving"
      ? "Enregistrement…"
      : status === "dirty"
        ? "Modifications…"
        : status === "error"
          ? "Erreur"
          : status === "saved"
            ? "Enregistré"
            : "À jour";
  const dotCls =
    status === "error"
      ? "bg-destructive"
      : status === "dirty" || status === "saving"
        ? "bg-accent animate-pulse"
        : status === "saved"
          ? "bg-accent"
          : "bg-muted";

  const choosePreset = (id: string) => {
    setMenuOpen(false);
    const preset = [...TEMPLATE_PRESETS, ...systemPresets].find((p) => p.id === id);
    if (!preset) return;
    // Le preset s'applique au modèle ouvert : ses fiches suivent le schéma.
    void handlePresetReplace(preset);
  };

  // Un seul sélecteur partagé par la barre large et le menu compact.
  const presetSelect = (className: string) => (
    <select
      className={`input h-9 shrink-0 px-2.5 py-0 text-xs ${className}`}
      name="preset-ajout"
      value=""
      aria-label="Ajouter depuis un preset"
      onChange={(e) => {
        const id = e.target.value;
        e.target.value = ""; // repasse le placeholder après le choix
        choosePreset(id);
      }}
    >
      <option value="">Preset…</option>
      {PRESET_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ))}
      {systemPresets.length > 0 && (
        <optgroup label="Mes presets">
          {systemPresets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );

  // Mêmes boutons dans la barre large et dans le menu (pleine largeur).
  const headerActions = (inMenu: boolean) => (
    <>
      <button
        type="button"
        className={`btn h-9 gap-1.5 px-2.5 py-0 text-xs ${inMenu ? "w-full justify-start" : ""}`}
        onClick={() => {
          setMenuOpen(false);
          openStyle();
        }}
        title="CSS propre à ce modèle"
      >
        <PaletteIcon />
        Style
      </button>
      <button
        type="button"
        className={`btn h-9 px-2.5 py-0 text-xs ${inMenu ? "w-full justify-start" : ""}`}
        onClick={() => {
          setMenuOpen(false);
          setPreviewOpen(true);
        }}
      >
        Aperçu
      </button>
      <button
        type="button"
        className={`btn h-9 px-2.5 py-0 text-xs text-destructive hover:bg-destructive/10 ${
          inMenu ? "w-full justify-start" : ""
        }`}
        onClick={() => {
          setMenuOpen(false);
          void handleDelete();
        }}
      >
        Supprimer
      </button>
    </>
  );

  return (
    <>
      {/* `@container` : le repli dépend de la largeur réelle du panneau éditeur,
          pas de celle de la fenêtre (barre latérale + palette variables). */}
      <header className="@container sticky top-0 z-30 flex shrink-0 flex-nowrap items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-1.5" title="Nom du modèle">
            <span className="hidden shrink-0 text-[0.65rem] tracking-widest text-muted uppercase @min-[72rem]:inline">
              Nom
            </span>
            <input
              className="input h-9 min-w-0 w-full max-w-44 px-2.5 py-0 text-sm"
              name="modele-nom"
              value={selected.name}
              aria-label="Nom du modèle"
              onChange={(e) => patchSelected((t) => ({ ...t, name: e.target.value }))}
            />
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-1.5" title="Catégorie du modèle">
            <span className="hidden shrink-0 text-[0.65rem] tracking-widest text-muted uppercase @min-[72rem]:inline">
              Catégorie
            </span>
            <input
              className="input h-9 min-w-0 w-full max-w-40 px-2.5 py-0 text-sm"
              name="modele-categorie"
              value={selected.category ?? ""}
              placeholder="Sans catégorie"
              aria-label="Catégorie du modèle"
              onChange={(e) =>
                patchSelected((t) => ({
                  ...t,
                  category: e.target.value || null,
                }))
              }
              list={`${campaignId}-tcat-edit`}
            />
            <datalist id={`${campaignId}-tcat-edit`}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          {/* Presets : dans la barre au large, dans le menu sinon. */}
          <div className="hidden shrink-0 items-center gap-2 @min-[56rem]:flex">
            {presetSelect("w-48")}
          </div>
        </div>
        <span
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 px-2 text-[0.65rem] tracking-widest uppercase ${
            status === "error" ? "text-destructive" : "text-muted"
          }`}
          title={statusLabel}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} aria-hidden />
          <span className="hidden @min-[72rem]:inline">{statusLabel}</span>
        </span>
        <div className="hidden shrink-0 items-center gap-2 @min-[56rem]:flex">
          {headerActions(false)}
        </div>
        <div ref={menuRef} className="relative shrink-0 @min-[56rem]:hidden">
          <button
            ref={triggerRef}
            type="button"
            className="btn h-9 w-9 p-0"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? "template-builder-menu" : undefined}
            aria-label="Actions du modèle"
            title="Actions du modèle"
          >
            <MenuIcon />
          </button>
          {menuOpen && (
            <div
              id="template-builder-menu"
              className="panel absolute top-full right-0 z-50 mt-2 flex w-60 flex-col gap-2 p-2"
              aria-label="Actions du modèle"
            >
              {presetSelect("w-full")}
              <div className="flex flex-col gap-2 border-t border-border pt-2">
                {headerActions(true)}
              </div>
            </div>
          )}
        </div>
      </header>
      <GameModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        label={`Aperçu — ${selected.name}`}
      >
        <p className="mb-3 text-xs text-muted">Aperçu — aucune donnée n’est enregistrée.</p>
        <div className="rounded border border-border bg-card p-4">
          {/* Monté seulement à l’ouverture : rien ne tourne tant que la modale est fermée. */}
          {previewOpen && (
            <TemplateForm
              campaignId={campaignId}
              entityId=""
              schemaRaw={{ fields: previewFields }}
              initialData={{}}
              notes={[]}
              templates={[]}
              customCss={selected.customCss ?? null}
              onStatus={() => {}}
              onNavigate={() => {}}
              preview
            />
          )}
        </div>
      </GameModal>
      <GameModal
        open={styleOpen}
        onClose={() => setStyleOpen(false)}
        label={`Style — ${selected.name}`}
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">
            Style propre à ce modèle, appliqué à toutes ses fiches. La DA globale (thème, modules,
            panneaux) se règle dans les réglages de campagne.
          </p>
          <textarea
            className="input min-h-64 w-full font-mono text-xs"
            value={cssDraft}
            aria-label="CSS personnalisé du modèle"
            spellCheck={false}
            placeholder={".template-form .mon-champ { color: var(--accent); }"}
            onChange={(e) => setCssDraft(e.target.value)}
          />
          {styleError && <p className="text-xs text-destructive">{styleError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn px-3 py-1.5 text-xs"
              onClick={() => setStyleOpen(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn bg-accent px-3 py-1.5 text-xs text-background"
              disabled={savingStyle}
              onClick={() => void saveStyle()}
            >
              {savingStyle ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </GameModal>
    </>
  );
}
