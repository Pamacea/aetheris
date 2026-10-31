"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { GameModal } from "@/components/game-modal";
import { ChevronRightIcon } from "@/components/icons";
import { readCoverFile } from "@/features/novels/cover-image";
import type { WikiNoteMeta } from "../types";
import type { FieldProps } from "./template-form-field";

/** Sources acceptées : URL http(s) ou data URI image (aucun test réseau). */
function isImageSrc(v: string): boolean {
  return /^https?:\/\//i.test(v) || /^data:image\//i.test(v);
}

/** Champs simples : texte, zone de texte, toggle, CSS, image, tag. */
export function TextField({ field, value, chrome, rt }: FieldProps<"text">) {
  return (
    <label
      className={`flex h-full min-h-0 flex-col gap-1 ${chrome.widthCls}`}
      onDragOver={rt.noteOver}
      onDrop={(e) => rt.dropLink(e, field.id, typeof value === "string" ? value : "")}
    >
      {chrome.label}
      <input
        className={`input h-full flex-1 ${chrome.sizeCls}`}
        name={field.id}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => rt.setValue(field.id, e.target.value)}
      />
      {chrome.help}
    </label>
  );
}

export function TextareaField({ field, value, chrome, rt }: FieldProps<"textarea">) {
  return (
    // `h-full min-h-0` : la zone épouse la cellule de la grille au lieu de la déborder.
    <label
      className={`flex h-full min-h-0 flex-col gap-1 ${chrome.widthCls}`}
      onDragOver={rt.noteOver}
      onDrop={(e) => rt.dropLink(e, field.id, typeof value === "string" ? value : "")}
    >
      {chrome.label}
      <textarea
        className={`input min-h-0 flex-1 resize-none ${chrome.sizeCls}`}
        name={field.id}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => rt.setValue(field.id, e.target.value)}
      />
      {chrome.help}
    </label>
  );
}

export function ToggleField({ field, value, chrome, rt }: FieldProps<"toggle">) {
  return (
    <label className={`flex h-full min-h-0 flex-col gap-1 ${chrome.widthCls}`}>
      <span className="flex min-h-0 flex-1 items-center gap-2 pb-1">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          name={field.id}
          checked={value === true}
          onChange={(e) => rt.setValue(field.id, e.target.checked)}
        />
        <span className="text-sm">{field.label}</span>
        {chrome.help}
      </span>
    </label>
  );
}

export function CssField({ field, value, chrome, rt }: FieldProps<"css">) {
  const css = typeof value === "string" ? value : "";
  return (
    <div className={`flex flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.label}
      <textarea
        className="input min-h-20 py-2 font-mono text-xs"
        name={field.id}
        spellCheck={false}
        value={css}
        placeholder="Ex. .template-form { border: 1px solid crimson; }"
        onChange={(e) => rt.setValue(field.id, e.target.value)}
      />
      {chrome.help}
    </div>
  );
}

export function ImageField({ field, value, chrome, rt }: FieldProps<"image">) {
  const url = typeof value === "string" ? value : "";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"file" | "url">("file");
  const [fileValue, setFileValue] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const draft = tab === "file" ? fileValue : urlValue.trim();
  const canSave = tab === "file" ? Boolean(fileValue) : isImageSrc(urlValue.trim());

  function openPicker() {
    const isData = url.startsWith("data:image/");
    setFileValue(isData ? url : null);
    setUrlValue(isData || !url ? "" : url);
    setTab(isData || !url ? "file" : "url");
    setError(null);
    setOpen(true);
  }

  function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    readCoverFile(file).then(setFileValue, (e: Error) => setError(e.message));
  }

  function save() {
    if (!canSave) return;
    rt.setValue(field.id, tab === "file" ? fileValue : urlValue.trim());
    setOpen(false);
  }

  return (
    <div className={`flex h-full min-h-0 flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.label}
      <div className="relative min-h-0 flex-1">
        <button
          type="button"
          onClick={openPicker}
          className="flex h-full w-full items-center justify-center overflow-hidden border border-dashed border-border bg-transparent text-sm text-muted transition hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="h-full w-full object-contain"
              style={{ maxHeight: field.height }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            "Choisir une illustration"
          )}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => rt.setValue(field.id, null)}
            aria-label="Retirer l'illustration"
            className="absolute top-1 right-1 bg-black/50 px-1.5 text-xs leading-5 text-white transition hover:bg-black/80"
          >
            ✕
          </button>
        )}
      </div>
      {chrome.help}

      {open && (
        <GameModal open={open} onClose={() => setOpen(false)} label="Illustration">
          <div className="flex flex-col gap-4">
            <div
              role="tablist"
              aria-label="Source de l'illustration"
              className="flex gap-2 border-b border-border"
            >
              {(["file", "url"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => {
                    setTab(t);
                    setError(null);
                  }}
                  className={`-mb-px border-b-2 px-2 pb-1 text-sm transition ${
                    tab === t
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {t === "file" ? "Fichier" : "URL"}
                </button>
              ))}
            </div>

            {tab === "file" ? (
              <div role="tabpanel" className="flex flex-col gap-3">
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pick(e.dataTransfer.files[0]);
                  }}
                  className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-border px-4 py-6 text-center text-sm transition hover:bg-card-hover"
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => pick(e.target.files?.[0])}
                  />
                  <span>Glissez une image ici</span>
                  <span className="text-xs text-muted">
                    ou cliquez pour parcourir · max ~1,2 Mo
                  </span>
                </label>
                {draft && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft}
                    alt=""
                    className="h-40 w-full border border-border object-contain"
                  />
                )}
              </div>
            ) : (
              <div role="tabpanel" className="flex flex-col gap-3">
                <input
                  type="url"
                  className="input"
                  placeholder="https://…"
                  value={urlValue}
                  autoFocus
                  onChange={(e) => {
                    setUrlValue(e.target.value);
                    setError(null);
                  }}
                />
                {isImageSrc(urlValue.trim()) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlValue.trim()}
                    alt=""
                    className="h-40 w-full border border-border object-contain"
                  />
                )}
                <p className="text-xs text-muted">URL http(s) ou data:image — aucun test réseau.</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <footer className="flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="btn">
                Annuler
              </button>
              <button type="button" onClick={save} disabled={!canSave} className="btn btn-primary">
                Valider
              </button>
            </footer>
          </div>
        </GameModal>
      )}
    </div>
  );
}

/**
 * Menu de choix de fiche, dans la DA du site. Rendu dans un portail en
 * `position: fixed` : la cellule de grille défile (`overflow`) et rognerait
 * un menu en flux. Fermé au clic extérieur, à Échap, au scroll et au resize.
 */
function NoteMenu({
  anchor,
  candidates,
  exclude = [],
  onPick,
  onClose,
}: {
  anchor: DOMRect;
  candidates: WikiNoteMeta[];
  exclude?: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current?.contains(t) || t.closest("[data-link-picker]")) return;
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
  }, [onClose]);

  const opts = candidates.filter((n) => !exclude.includes(n.id));
  const width = Math.max(anchor.width, 200);
  const below = anchor.bottom + 280 < window.innerHeight;
  const height = Math.max(
    96,
    Math.min(256, (below ? window.innerHeight - anchor.bottom : anchor.top) - 12),
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
      aria-label="Fiches liées"
      style={style}
      className="no-scrollbar overflow-y-auto border border-border bg-background py-1 shadow-lg"
    >
      {opts.length === 0 && <p className="px-2.5 py-1 text-xs text-muted">Aucune fiche.</p>}
      {opts.map((n) => (
        <button
          key={n.id}
          type="button"
          role="option"
          aria-selected={false}
          title={n.title}
          onClick={() => {
            onPick(n.id);
            onClose();
          }}
          className="block w-full truncate px-2.5 py-1 text-left text-xs text-foreground transition hover:bg-card-hover hover:text-accent"
        >
          {n.title}
        </button>
      ))}
    </div>,
    document.body,
  );
}

/** Lien unique vers une fiche : boîte fixe, clic n'importe où pour choisir. */
export function LinkedNoteSelect({
  field,
  value,
  chrome,
  rt,
  candidates,
}: {
  field: { id: string; label: string };
  value: string | null;
  chrome: FieldProps<"tag">["chrome"];
  rt: FieldProps<"tag">["rt"];
  candidates: WikiNoteMeta[];
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<DOMRect | null>(null);
  const title = value ? (rt.notes.find((n) => n.id === value)?.title ?? value) : null;
  const openPicker = () => {
    if (menu) {
      setMenu(null);
      return;
    }
    setMenu(boxRef.current?.getBoundingClientRect() ?? null);
  };
  return (
    <div className={`flex h-full min-h-0 flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.label}
      <div
        ref={boxRef}
        data-link-picker
        className="relative flex min-h-0 flex-1 cursor-pointer items-center overflow-hidden border border-border px-1.5 pr-7"
        title="Ajouter"
        onClick={openPicker}
        onDragOver={rt.noteOver}
        onDrop={(e) => {
          const n = rt.notePayload(e);
          if (!n || !candidates.some((c) => c.id === n.id)) return;
          e.preventDefault();
          rt.setValue(field.id, n.id);
        }}
      >
        {title ? (
          <span className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs">
            <button
              type="button"
              className="max-w-40 truncate text-left text-accent hover:underline"
              title={title}
              onClick={(e) => {
                e.stopPropagation();
                if (value) rt.onNavigate(value);
              }}
            >
              {title}
            </button>
            <button
              type="button"
              className="text-muted hover:text-destructive"
              aria-label={`Retirer ${title}`}
              onClick={(e) => {
                e.stopPropagation();
                rt.setValue(field.id, null);
              }}
            >
              ×
            </button>
          </span>
        ) : (
          <span className="px-1 py-0.5 text-xs text-muted">Ajouter…</span>
        )}
        <button
          type="button"
          aria-label={`Ajouter — ${field.label}`}
          aria-haspopup="listbox"
          aria-expanded={Boolean(menu)}
          className="absolute top-1/2 right-1 -translate-y-1/2 p-0.5 text-foreground hover:text-accent"
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
        >
          <ChevronRightIcon className="h-4 w-4 rotate-90" />
        </button>
      </div>
      {menu && (
        <NoteMenu
          anchor={menu}
          candidates={candidates}
          onPick={(id) => rt.setValue(field.id, id)}
          onClose={() => setMenu(null)}
        />
      )}
      {chrome.help}
    </div>
  );
}

export function TagField({ field, value, chrome, rt }: FieldProps<"tag">) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<DOMRect | null>(null);
  const candidates = rt.notes.filter((n) => {
    if (!field.targetCategory) return true;
    return rt.categoryOf(n) === field.targetCategory;
  });
  if (field.multiple) {
    const picked = Array.isArray(value)
      ? value.filter((x): x is string => typeof x === "string")
      : [];
    const add = (id: string) => {
      if (!id || picked.includes(id) || picked.length >= 50) return;
      rt.setValue(field.id, [...picked, id]);
    };
    // Clic n'importe où dans la boîte (hors lien) : menu dans la DA, en portail.
    const openPicker = () => {
      if (menu) {
        setMenu(null);
        return;
      }
      setMenu(boxRef.current?.getBoundingClientRect() ?? null);
    };
    return (
      <div className={`flex h-full min-h-0 flex-col gap-1 ${chrome.widthCls}`}>
        {chrome.label}
        <div
          ref={boxRef}
          data-link-picker
          className="relative min-h-0 flex-1 cursor-pointer border border-border"
          title="Ajouter"
          onClick={openPicker}
          onDragOver={rt.noteOver}
          onDrop={(e) => {
            const n = rt.notePayload(e);
            if (!n || !candidates.some((c) => c.id === n.id)) return;
            e.preventDefault();
            add(n.id);
          }}
        >
          {/* Valeurs dans la boîte : le menu est en portail, la taille du champ
              ne dépend pas de ce qui est ajouté. */}
          <div className="no-scrollbar flex h-full flex-wrap content-start items-start gap-1 overflow-y-auto p-1 pr-7">
            {picked.map((id) => {
              const title = rt.notes.find((n) => n.id === id)?.title ?? id;
              return (
                <span
                  key={id}
                  className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs"
                >
                  <button
                    type="button"
                    className="max-w-40 truncate text-left text-accent hover:underline"
                    title={title}
                    onClick={(e) => {
                      e.stopPropagation();
                      rt.onNavigate(id);
                    }}
                  >
                    {title}
                  </button>
                  <button
                    type="button"
                    className="text-muted hover:text-destructive"
                    aria-label={`Retirer ${title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      rt.setValue(
                        field.id,
                        picked.filter((x) => x !== id),
                      );
                    }}
                  >
                    ×
                  </button>
                </span>
              );
            })}
            {picked.length === 0 && (
              <span className="px-1 py-0.5 text-xs text-muted">Ajouter…</span>
            )}
          </div>
          <button
            type="button"
            aria-label={`Ajouter — ${field.label}`}
            aria-haspopup="listbox"
            aria-expanded={Boolean(menu)}
            className="absolute top-1/2 right-1 -translate-y-1/2 p-0.5 text-foreground hover:text-accent"
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
          >
            <ChevronRightIcon className="h-4 w-4 rotate-90" />
          </button>
        </div>
        {menu && (
          <NoteMenu
            anchor={menu}
            candidates={candidates}
            exclude={picked}
            onPick={add}
            onClose={() => setMenu(null)}
          />
        )}
        {chrome.help}
      </div>
    );
  }
  return (
    <LinkedNoteSelect
      field={field}
      value={typeof value === "string" ? value : null}
      chrome={chrome}
      rt={rt}
      candidates={candidates}
    />
  );
}
