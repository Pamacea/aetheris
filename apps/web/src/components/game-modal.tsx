"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Dernier focus connu HORS de toute modale : l'effet de GameModal ne peut
 * pas lire `document.activeElement` au montage (l'`autoFocus` du contenu a
 * déjà pris le dessus), on capture donc le déclencheur à son focusin.
 */
let lastTrigger: HTMLElement | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if (t instanceof HTMLElement && t !== document.body && !t.closest('[role="dialog"]')) {
      lastTrigger = t;
    }
  });
}

/**
 * Modale réutilisable — pattern maison (create-campaign-dialog) :
 * focus au montage + retour au focus initial, fermeture par Échap ou clic
 * backdrop. Fermeture gérée par le parent (`open`/`onClose`).
 * Rendue en `position: fixed` → indépendante du conteneur canvas VTT.
 */
export function GameModal({
  open,
  onClose,
  label,
  children,
  frame = true,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  /**
   * `false` = le contenu fournit déjà son propre panneau/entête (les dialogs
   * de formulaires à 540px, dont create-campaign-form.tsx — fichier hors
   * périmètre de la refonte des modales). GameModal n'apporte alors que le
   * voile, Échap, le verrouillage du scroll et la gestion du focus.
   */
  frame?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Handler en ref : un re-render du parent ne doit pas re-voler le focus.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    // Déclencheur mémorisé (voir lastTrigger) : activeElement serait déjà
    // l'autoFocus du contenu.
    const previous = lastTrigger;
    // Un focus déjà posé dans le contenu (autoFocus d'un champ) prime.
    const target = frame ? panelRef.current : containerRef.current;
    if (target && !target.contains(document.activeElement)) target.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      // Piège Tab : le focus ne doit pas sortir derrière la modale.
      const root = frame ? panelRef.current : containerRef.current;
      if (!root) return;
      const focusables = [
        ...root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      const outside = !active || !root.contains(active);
      if (e.shiftKey && (outside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (outside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open, frame]);

  // Structure identique ouverte/fermée (`hidden` = display:none) : les
  // enfants ne sont jamais démontés — l'état local survit à la réouverture
  // (sinon initialState serveur périmé écrase les commits) et les listeners
  // sync (ambiance/combat) restent actifs en arrière-plan.
  return (
    <div
      ref={containerRef}
      tabIndex={frame ? undefined : -1}
      className={open ? "fixed inset-0 z-50 flex items-center justify-center p-4" : "hidden"}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      {frame ? (
        <div
          ref={panelRef}
          tabIndex={-1}
          className="panel relative flex max-h-[90vh] w-[min(90vw,60rem)] flex-col overflow-y-auto p-6 outline-none"
        >
          <header className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-xl tracking-wide">
              <span className="mark-tri" aria-hidden />
              {label}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="btn px-2 py-0.5 text-sm"
            >
              ✕
            </button>
          </header>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
