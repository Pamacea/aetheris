import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import type { FieldProps } from "./template-form-field";
import { ListCell } from "./template-form-list-cell";
import {
  cardColumnTemplate,
  cardWidth,
  noteVisuals,
  numberColumn,
  valueColumns,
} from "./linked-notes";
import { NOTE_MIME } from "./note-drop";
import { scrollEdgesOf } from "./template-list-scroll";

/** Table éditable (lignes = tableaux d'objets) avec agrégats calculés. */

export function ListField({
  field,
  value,
  chrome,
  rt,
}: FieldProps<"list" | "ability" | "inventory">) {
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const [over, setOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const emptyRef = useRef<HTMLSpanElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  // Décalage du texte vide pour rester centré dans la zone visible pendant le scroll.
  const [emptyShift, setEmptyShift] = useState(0);
  const setCell = (ri: number, colId: string, v: unknown) =>
    rt.setValue(
      field.id,
      rows.map((r, j) => (j === ri ? { ...r, [colId]: v } : r)),
    );
  // Sorts/inventaire sans colonne « tag » : la première colonne porte la fiche
  // glissée (l'id), sinon l'ajout ne pourrait se faire que manuellement.
  const linkCol =
    field.columns.find((c) => c.type === "tag") ??
    (field.kind === "ability" || field.kind === "inventory" ? field.columns[0] : undefined);
  // Sorts/compétences et inventaire : une carte par fiche liée.
  const cards = !!linkCol && (field.kind === "ability" || field.kind === "inventory");
  const cols = linkCol ? valueColumns(field.columns, linkCol.id) : [];
  const qtyCol = numberColumn(field.columns, "quantite");
  const weightCol = numberColumn(field.columns, "poids");
  const count = rt.numericScope[`${field.id}_n`] ?? 0;
  // Chevrons de défilement : tables, sorts/compétences et inventaires.
  const showChevrons = field.columns.length > 0;

  // Texte d'état vide : centré sur la largeur VISIBLE, pas sur le cadre défilable.
  const centerEmpty = useCallback(() => {
    const el = scrollRef.current;
    const span = emptyRef.current;
    if (!el || !span) return 0;
    const r = span.getBoundingClientRect();
    const e = el.getBoundingClientRect();
    const delta = e.left + e.width / 2 - (r.left + r.width / 2);
    if (Math.abs(delta) < 0.5) return 0;
    setEmptyShift((prev) => prev + delta);
    return Math.abs(delta);
  }, []);

  // Bornes des chevrons + centrage du texte : recalculés au scroll et au resize.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges(scrollEdgesOf(el));
    // La mise en page se stabilise sur plusieurs frames (polices, panneaux) :
    // on recentre jusqu'à trois frames stables, sans boucle infinie.
    let raf = 0;
    let frames = 0;
    let stable = 0;
    const tick = () => {
      stable = centerEmpty() === 0 ? stable + 1 : 0;
      frames += 1;
      if (stable < 3 && frames < 120) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    if (typeof ResizeObserver === "undefined") return () => cancelAnimationFrame(raf);
    const ro = new ResizeObserver(() => {
      setEdges(scrollEdgesOf(el));
      centerEmpty();
    });
    ro.observe(el);
    if (emptyRef.current) ro.observe(emptyRef.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [rows.length, field.columns.length, centerEmpty]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setEdges(scrollEdgesOf(el));
    centerEmpty();
  };
  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollRef.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  // Ajout d'une fiche (glisser-déposer ou sélection) : filtre la catégorie du
  // modèle et refuse les doublons.
  const addRow = (noteId: string) => {
    if (!linkCol) return;
    const meta = rt.notes.find((n) => n.id === noteId);
    if (!meta) return;
    if (linkCol.targetCategory && rt.categoryOf(meta) !== linkCol.targetCategory) return;
    if (rows.some((r) => r[linkCol.id] === noteId)) return;
    const row: Record<string, unknown> = { [linkCol.id]: noteId };
    if (field.kind === "inventory") {
      if (numberColumn(field.columns, "quantite")) row.quantite = 1;
      const { weight } = noteVisuals(noteId, rt.linked, rt.notes);
      if (weight != null && numberColumn(field.columns, "poids")) row.poids = weight;
    }
    rt.setValue(field.id, [...rows, row]);
  };
  const onDrop = (e: React.DragEvent) => {
    setOver(false);
    const payload = rt.notePayload(e);
    const first = field.columns[0];
    if (!payload) return;
    e.preventDefault();
    if (linkCol) addRow(payload.id);
    // Liste libre (sans fiche liée) : le glisser reste le seul ajout possible.
    else if (first) rt.setValue(field.id, [...rows, { [first.id]: payload.title }]);
  };
  // Fiches éligibles pas encore liées (menu d'ajout rapide).
  const candidates = linkCol
    ? rt.notes
        .filter(
          (note) =>
            (!linkCol.targetCategory || rt.categoryOf(note) === linkCol.targetCategory) &&
            !rows.some((r) => r[linkCol.id] === note.id),
        )
        .sort((a, b) => a.title.localeCompare(b.title))
    : [];
  const onDragOver = (e: React.DragEvent) => {
    if (!linkCol && field.columns.length === 0) return;
    rt.noteOver(e);
    setOver(e.dataTransfer.types.includes(NOTE_MIME));
  };
  const onDragLeave = () => setOver(false);

  const rowScopeOf = (row: Record<string, unknown>) => {
    // Scope de ligne : colonnes nombre (formules de cellule).
    const scope: Record<string, number> = {};
    for (const c of field.columns) {
      if (c.type !== "number") continue;
      const n = Number(row[c.id]);
      if (Number.isFinite(n)) scope[c.id] = n;
    }
    return scope;
  };

  return (
    <div className={`flex h-full min-h-0 min-w-0 flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.label}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border ${
          over ? "border-accent bg-accent/10" : "border-border"
        }`}
      >
        {/* Chevrons posés aux deux bords de la ligne des libellés, sans barre. */}
        <div className="relative min-h-0 min-w-0 flex-1">
          {showChevrons && (
            <>
              <button
                type="button"
                className="absolute top-0 left-0 z-20 flex h-7 w-5 items-center justify-center bg-background text-muted hover:text-foreground disabled:opacity-30"
                aria-label="Colonnes précédentes"
                disabled={!edges.left}
                onClick={() => scrollByPage(-1)}
              >
                <ChevronLeftIcon className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="absolute top-0 right-0 z-20 flex h-7 w-5 items-center justify-center bg-background text-muted hover:text-foreground disabled:opacity-30"
                aria-label="Colonnes suivantes"
                disabled={!edges.right}
                onClick={() => scrollByPage(1)}
              >
                <ChevronRightIcon className="h-3 w-3" />
              </button>
            </>
          )}
          <div
            ref={scrollRef}
            onScroll={onScroll}
            /* Pas de tabIndex : le :focus-visible global dessinerait un cadre
               couleur accent autour de tout le bloc (molette + focus des
               champs internes suffisent au défilement). */
            role="region"
            aria-label={field.label}
            className="no-scrollbar h-full overflow-auto overscroll-contain"
          >
            {cards && linkCol ? (
              <>
                {cols.length > 0 &&
                  (field.kind === "ability" ? (
                    <div
                      className="sticky top-0 z-10 grid gap-2 border-b border-border bg-background px-[13px] py-1"
                      style={{
                        gridTemplateColumns: cardColumnTemplate(cols),
                        width: cardWidth(cols),
                      }}
                    >
                      {cols.map((c, i) => (
                        <span
                          key={c.id}
                          className={`truncate text-[0.6rem] tracking-widest text-muted uppercase ${
                            i === 0 ? "pl-4" : i === cols.length - 1 ? "pr-4" : ""
                          }`}
                        >
                          {c.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    // Inventaire : mêmes largeurs que la ligne principale des cartes.
                    <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-border bg-background px-2 py-1 text-[0.6rem] tracking-widest text-muted uppercase">
                      <span className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{linkCol.label}</span>
                      {qtyCol && <span className="w-14 shrink-0 truncate">{qtyCol.label}</span>}
                      {weightCol && (
                        <span className="w-16 shrink-0 truncate">{weightCol.label}</span>
                      )}
                      <span className="w-7 shrink-0" aria-hidden />
                    </div>
                  ))}
                <div className="flex flex-col gap-1 p-1">
                  {rows.map((row, ri) => {
                    const id =
                      typeof row[linkCol.id] === "string" ? (row[linkCol.id] as string) : "";
                    const note = id ? rt.linked[id] : undefined;
                    const title = note?.title ?? rt.notes.find((n) => n.id === id)?.title ?? id;
                    const rowScope = rowScopeOf(row);
                    const remove = () =>
                      rt.setValue(
                        field.id,
                        rows.filter((_, j) => j !== ri),
                      );
                    const cell = (c: (typeof field.columns)[number]) => (
                      <ListCell
                        column={c}
                        cell={row[c.id]}
                        sizeCls={chrome.sizeCls}
                        notes={rt.notes}
                        categoryOf={rt.categoryOf}
                        numericScope={rt.numericScope}
                        rowScope={rowScope}
                        onNavigate={rt.onNavigate}
                        onChange={(v) => setCell(ri, c.id, v)}
                      />
                    );

                    if (field.kind === "inventory") {
                      const visuals = noteVisuals(id, rt.linked, rt.notes);
                      const qty = numberColumn(field.columns, "quantite");
                      const weight = numberColumn(field.columns, "poids");
                      const rest = field.columns.filter(
                        (c) => c.id !== linkCol.id && c.id !== qty?.id && c.id !== weight?.id,
                      );
                      return (
                        <div key={ri} className="border border-border bg-card px-2 py-1">
                          <div className="flex items-center gap-1.5">
                            {visuals.icon ? (
                              <img
                                src={visuals.icon}
                                alt=""
                                className="h-5 w-5 shrink-0 rounded object-cover"
                              />
                            ) : (
                              <span
                                aria-hidden
                                className="flex h-5 w-5 shrink-0 items-center justify-center text-xs text-muted"
                              >
                                ▣
                              </span>
                            )}
                            {id ? (
                              <button
                                type="button"
                                title={title}
                                className="min-w-0 flex-1 truncate text-left text-sm text-accent hover:underline"
                                onClick={() => rt.onNavigate(id)}
                              >
                                {title}
                              </button>
                            ) : (
                              <span className="min-w-0 flex-1 text-sm text-muted">
                                Fiche non liée
                              </span>
                            )}
                            {qty && (
                              <label className="w-14 shrink-0" title={qty.label}>
                                <span className="sr-only">{qty.label}</span>
                                {cell(qty)}
                              </label>
                            )}
                            {weight ? (
                              <label className="w-16 shrink-0" title={weight.label}>
                                <span className="sr-only">{weight.label}</span>
                                {cell(weight)}
                              </label>
                            ) : (
                              <span
                                className="w-10 shrink-0 text-right text-xs text-muted"
                                title="Poids"
                              >
                                {visuals.weight ?? "—"}
                              </span>
                            )}
                            <button
                              type="button"
                              className="btn shrink-0 px-1.5 py-0.5 text-xs text-destructive"
                              aria-label={`Supprimer la ligne ${ri + 1}`}
                              onClick={remove}
                            >
                              ✕
                            </button>
                          </div>
                          {rest.length > 0 && (
                            <div className="mt-1 flex flex-wrap items-center gap-2 pl-6">
                              {rest.map((c) => (
                                <label key={c.id} className="w-24 shrink-0" title={c.label}>
                                  <span className="sr-only">{c.label}</span>
                                  {cell(c)}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={ri} className="border border-border bg-card px-2 py-1.5">
                        <div className="flex items-start gap-2">
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex min-w-0 items-baseline gap-2">
                              {id ? (
                                <button
                                  type="button"
                                  title={title}
                                  className="min-w-0 truncate text-left text-sm text-accent hover:underline"
                                  onClick={() => rt.onNavigate(id)}
                                >
                                  {title}
                                </button>
                              ) : (
                                <span className="text-sm text-muted">Fiche non liée</span>
                              )}
                              {note?.templateName && (
                                <span className="shrink-0 text-[0.6rem] tracking-widest text-muted uppercase">
                                  {note.templateName}
                                </span>
                              )}
                            </div>
                            {note && note.summary.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {note.summary.map(([label, val], i) => (
                                  <span
                                    key={`${label}-${i}`}
                                    className="border border-border px-1.5 py-0.5 text-[0.65rem] text-muted"
                                  >
                                    {label} : {val}
                                  </span>
                                ))}
                              </div>
                            )}
                            {cols.length > 0 && (
                              <div
                                className="grid items-center gap-2"
                                style={{
                                  gridTemplateColumns: cardColumnTemplate(cols),
                                  width: cardWidth(cols),
                                }}
                              >
                                {cols.map((c) => (
                                  <div key={c.id} className="min-w-0">
                                    {cell(c)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn px-1.5 py-0.5 text-xs text-destructive"
                            aria-label={`Supprimer la ligne ${ri + 1}`}
                            onClick={remove}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {rows.length === 0 && (
                    <p
                      className="relative w-full border border-dashed border-border px-2 py-4 text-xs text-muted"
                      style={cols.length > 0 ? { minWidth: cardWidth(cols) } : undefined}
                    >
                      <span
                        ref={emptyRef}
                        className="absolute top-1/2 left-0 whitespace-nowrap"
                        style={{ transform: `translateX(${emptyShift}px) translateY(-50%)` }}
                      >
                        Glissez une fiche ici pour l’ajouter
                      </span>
                    </p>
                  )}
                </div>
              </>
            ) : (
              <table className="w-full min-w-[300px] text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border">
                    {field.columns.map((c, i) => (
                      <th
                        key={c.id}
                        className={`py-1 pr-2 text-left text-[0.6rem] tracking-widest text-muted uppercase ${
                          // Le chevron gauche est posé sur le bord : on lui laisse la place.
                          i === 0 ? "pl-6" : "pl-2"
                        }`}
                      >
                        {c.label}
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-border last:border-0">
                      {field.columns.map((c) => (
                        <td key={c.id} className="px-1 py-1">
                          <ListCell
                            column={c}
                            cell={row[c.id]}
                            sizeCls={chrome.sizeCls}
                            notes={rt.notes}
                            categoryOf={rt.categoryOf}
                            numericScope={rt.numericScope}
                            rowScope={rowScopeOf(row)}
                            onNavigate={rt.onNavigate}
                            onChange={(v) => setCell(ri, c.id, v)}
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1 text-center">
                        <button
                          type="button"
                          className="btn px-1.5 py-0.5 text-xs text-destructive"
                          aria-label={`Supprimer la ligne ${ri + 1}`}
                          onClick={() =>
                            rt.setValue(
                              field.id,
                              rows.filter((_, j) => j !== ri),
                            )
                          }
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        className="px-2 py-2 text-xs text-muted"
                        colSpan={field.columns.length + 1}
                      >
                        Glissez une fiche ici pour l’ajouter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Pied toujours rendu : agrégats Σ (y compris sorts/inventaires liés).
            Aucun ajout textuel : sélection de fiches ou glisser-déposer. */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-2 py-1">
          {linkCol && (
            <label className="min-w-0 flex-1 sm:max-w-64">
              <span className="sr-only">Ajouter une fiche à {field.label}</span>
              <select
                className="input input-sm w-full"
                defaultValue=""
                disabled={rows.length >= 100 || candidates.length === 0}
                onChange={(e) => {
                  addRow(e.currentTarget.value);
                  e.currentTarget.value = "";
                }}
              >
                <option value="">
                  {candidates.length > 0 ? "+ Lier une fiche…" : "Aucune fiche disponible"}
                </option>
                {candidates.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className="text-xs text-muted">
            {count} ligne{count > 1 ? "s" : ""}
            {field.columns
              .filter((c) => c.type === "number")
              .map((c) => {
                const sum = rt.numericScope[`${field.id}_${c.id}`] ?? 0;
                return (
                  <span key={c.id} className="ml-3">
                    Σ {c.label} : {Math.round(sum * 100) / 100}
                  </span>
                );
              })}
          </span>
        </div>
      </div>
      {chrome.help}
    </div>
  );
}
