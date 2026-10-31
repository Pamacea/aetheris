import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronRightIcon } from "@/components/icons";

export interface VttSelectOption {
  value: string;
  label: string;
  /** Infobulle (styles de mur, vision…). */
  title?: string;
}

interface VttSelectProps {
  value: string;
  options: VttSelectOption[];
  onChange: (value: string) => void;
  /** Libellé accessible du champ. */
  label: string;
  widthCls?: string;
  title?: string;
}

/**
 * Select de la table, dans la DA Aetheris : le `<select>` natif ouvrait un
 * menu blanc du système. Le menu est en portail `position: fixed` pour ne pas
 * être rogné par la table, et se ferme au clic extérieur, à Échap et au scroll.
 */
export function VttSelect({
  value,
  options,
  onChange,
  label,
  widthCls = "w-44",
  title,
}: VttSelectProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const current = options.find((o) => o.value === value);

  const toggle = () => {
    if (anchor) {
      setAnchor(null);
      return;
    }
    setAnchor(btnRef.current?.getBoundingClientRect() ?? null);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={Boolean(anchor)}
        aria-label={label}
        title={title ?? current?.title}
        onClick={toggle}
        className={`flex h-6 cursor-pointer items-center justify-between gap-1 border border-amber-500/20 bg-neutral-900 px-1.5 text-left text-xs text-foreground transition hover:border-amber-500/50 hover:text-amber-200 ${widthCls}`}
      >
        <span className="truncate">{current?.label ?? "—"}</span>
        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 rotate-90 text-muted" />
      </button>
      {anchor && (
        <Menu
          anchor={anchor}
          triggerRef={btnRef}
          value={value}
          options={options}
          label={label}
          onPick={onChange}
          onClose={() => setAnchor(null)}
        />
      )}
    </>
  );
}

function Menu({
  anchor,
  triggerRef,
  value,
  options,
  label,
  onPick,
  onClose,
}: {
  anchor: DOMRect;
  triggerRef: RefObject<HTMLButtonElement | null>;
  value: string;
  options: VttSelectOption[];
  label: string;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      // Le déclencheur bascule lui-même : sinon il fermerait puis rouvrirait.
      if (ref.current?.contains(t) || triggerRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose, triggerRef]);

  const width = Math.max(anchor.width, 160);
  const below = anchor.bottom + 260 < window.innerHeight;
  const height = Math.max(
    96,
    Math.min(240, (below ? window.innerHeight - anchor.bottom : anchor.top) - 12),
  );
  const style: CSSProperties = {
    position: "fixed",
    left: Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)),
    width,
    maxHeight: height,
    ...(below ? { top: anchor.bottom + 4 } : { bottom: window.innerHeight - anchor.top + 4 }),
    zIndex: 9999,
  };

  return createPortal(
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      style={style}
      className="no-scrollbar overflow-y-auto border border-amber-500/20 bg-neutral-900/95 py-1 shadow-xl backdrop-blur-md"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="option"
          aria-selected={o.value === value}
          title={o.title}
          onClick={() => {
            onPick(o.value);
            onClose();
          }}
          className={`block w-full truncate px-2.5 py-1 text-left text-xs transition hover:bg-card-hover hover:text-accent ${
            o.value === value ? "text-accent" : "text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
