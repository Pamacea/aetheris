"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createLink, deleteLink } from "./actions";
import {
  clampZoom,
  curveControl,
  curveMidpoint,
  hasLinkBetween,
  initialPositions,
  screenToGraph,
  type GraphLink,
  type GraphNode,
  VIEW_H,
  VIEW_W,
  zoomAround,
} from "./layout";

interface SimState {
  vx: number;
  vy: number;
}

type Pos = { x: number; y: number };

const NODE_W = 128;
const NODE_H = 30;

/** Une itération de la simulation (forces bornées → jamais d'explosion). */
function stepSim(
  nodes: readonly GraphNode[],
  links: readonly GraphLink[],
  hidden: ReadonlySet<string>,
  pos: Map<string, Pos>,
  sim: Map<string, SimState>,
  dragId: string | null,
): number {
  const visible = nodes.filter((n) => !hidden.has(n.type));
  const ids = new Set(visible.map((n) => n.id));
  for (const n of visible) if (!sim.has(n.id)) sim.set(n.id, { vx: 0, vy: 0 });

  // Répulsion (cloisonnée en O(n²) — quelques dizaines de nœuds, pas plus).
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const pa = pos.get(visible[i].id)!;
      const pb = pos.get(visible[j].id)!;
      let dx = pb.x - pa.x;
      let dy = pb.y - pa.y;
      let d = Math.hypot(dx, dy);
      if (d < 1) {
        dx = 1;
        dy = 0;
        d = 1;
      }
      const mag = Math.min(6, 4000 / (d * d));
      const ux = (dx / d) * mag;
      const uy = (dy / d) * mag;
      const sa = sim.get(visible[i].id)!;
      const sb = sim.get(visible[j].id)!;
      sa.vx -= ux;
      sa.vy -= uy;
      sb.vx += ux;
      sb.vy += uy;
    }
  }

  // Ressorts sur les liens (repos ~110).
  for (const l of links) {
    if (l.fromEntityId === l.toEntityId) continue;
    if (!ids.has(l.fromEntityId) || !ids.has(l.toEntityId)) continue;
    const pa = pos.get(l.fromEntityId)!;
    const pb = pos.get(l.toEntityId)!;
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const mag = Math.max(-4, Math.min(4, (d - 110) * 0.03));
    const ux = (dx / d) * mag;
    const uy = (dy / d) * mag;
    sim.get(l.fromEntityId)!.vx += ux;
    sim.get(l.fromEntityId)!.vy += uy;
    sim.get(l.toEntityId)!.vx -= ux;
    sim.get(l.toEntityId)!.vy -= uy;
  }

  // Amortissement + rappel faible vers le centre.
  let energy = 0;
  for (const n of visible) {
    const p = pos.get(n.id)!;
    const s = sim.get(n.id)!;
    if (dragId === n.id) {
      s.vx = 0;
      s.vy = 0;
      continue;
    }
    s.vx = (s.vx + (VIEW_W / 2 - p.x) * 0.004) * 0.86;
    s.vy = (s.vy + (VIEW_H / 2 - p.y) * 0.004) * 0.86;
    p.x = Math.min(VIEW_W - 20, Math.max(20, p.x + s.vx));
    p.y = Math.min(VIEW_H - 20, Math.max(20, p.y + s.vy));
    energy += s.vx * s.vx + s.vy * s.vy;
  }
  return energy;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Écrit la transform (zoom + pan) du <g> de vue — écouteur stable pour les handlers. */
function applyView(el: SVGGElement | null, view: { zoom: number; pan: Pos }): void {
  el?.setAttribute("transform", `translate(${view.pan.x} ${view.pan.y}) scale(${view.zoom})`);
}

export function GraphClient({
  campaignId,
  nodes,
  links,
  isGM,
}: {
  campaignId: string;
  nodes: GraphNode[];
  links: GraphLink[];
  isGM: boolean;
}) {
  const [selection, setSelection] = useState<string[]>([]);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [label, setLabel] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Coordonnées d'entrée pour le HTML SSR/premier rendu (ensuite peintes en rAF) :
  // React ne réécrit pas ces attributs car la valeur rendue ne change jamais.
  const [base] = useState(() => initialPositions(nodes));

  // État de simulation tenu en refs : muté par la boucle rAF, jamais lu au rendu.
  const posRef = useRef<Map<string, Pos> | null>(null);
  const simRef = useRef<Map<string, SimState> | null>(null);
  const nodesRef = useRef(nodes);
  const linksRef = useRef(links);
  const hiddenRef = useRef(hidden);
  const dragRef = useRef<string | null>(null);
  const panRef = useRef<{ cx: number; cy: number; px: number; py: number } | null>(null);
  const movedRef = useRef(false);
  const hoveredRef = useRef<string | null>(null);
  const runningRef = useRef(false);
  const wakeRef = useRef<() => void>(() => {});

  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewGRef = useRef<SVGGElement | null>(null);
  const nodeEls = useRef(new Map<string, SVGGElement>());
  // Deux maps (et non un objet) : les ref inline sont recréées à chaque rendu,
  // React détache puis réattache — chaque map reste cohérente indépendamment.
  const edgeVis = useRef(new Map<string, SVGPathElement>());
  const edgeHit = useRef(new Map<string, SVGPathElement>());
  const labelRef = useRef<SVGTextElement | null>(null);
  // Vue (zoom + pan) mutée par les interactions, écrite directement dans le DOM :
  // un seul <g> porte la transform, aucun re-render React.
  const viewRef = useRef({ zoom: 1, pan: { x: 0, y: 0 } });

  /** Positions complètes pour les entités reçues ; true si un nœud a été ajouté. */
  const ensurePos = (): boolean => {
    if (posRef.current === null)
      posRef.current = new Map(Object.entries(initialPositions(nodesRef.current)));
    if (simRef.current === null) simRef.current = new Map();
    const fresh = initialPositions(nodesRef.current);
    let added = false;
    for (const n of nodesRef.current) {
      if (!posRef.current.has(n.id)) {
        posRef.current.set(n.id, fresh[n.id] ?? { x: VIEW_W / 2, y: VIEW_H / 2 });
        added = true;
      }
    }
    return added;
  };

  /** Écrit les positions dans le DOM : unique sortie des refs (rendu n'en lit aucune). */
  const paint = () => {
    const pos = posRef.current;
    if (!pos) return;
    for (const [id, el] of nodeEls.current) {
      const p = pos.get(id);
      if (p) el.setAttribute("transform", `translate(${p.x} ${p.y})`);
    }
    for (const [id, vis] of edgeVis.current) {
      const l = linksRef.current.find((x) => x.id === id);
      const pa = l && pos.get(l.fromEntityId);
      const pb = l && pos.get(l.toEntityId);
      if (!l || !pa || !pb) continue;
      const c = curveControl(pa, pb);
      const d = `M ${pa.x} ${pa.y} Q ${c.x} ${c.y} ${pb.x} ${pb.y}`;
      vis.setAttribute("d", d);
      edgeHit.current.get(id)?.setAttribute("d", d);
    }
    const labelEl = labelRef.current;
    const hl = hoveredRef.current
      ? linksRef.current.find((x) => x.id === hoveredRef.current)
      : null;
    if (labelEl && hl) {
      const pa = pos.get(hl.fromEntityId);
      const pb = pos.get(hl.toEntityId);
      if (pa && pb) {
        const mid = curveMidpoint(pa, curveControl(pa, pb), pb);
        labelEl.setAttribute("x", String(mid.x));
        labelEl.setAttribute("y", String(mid.y - 6));
      }
    }
  };

  // Avant chaque peinture : props → refs, positions à jour, DOM synchronisé.
  useLayoutEffect(() => {
    nodesRef.current = nodes;
    linksRef.current = links;
    hiddenRef.current = hidden;
    const added = ensurePos();
    paint();
    if (added) wakeRef.current();
  });

  // Simulation : rAF jusqu'à l'immobilité, se réveille au drag / filtre / nouveau nœud.
  useEffect(() => {
    let raf = 0;
    let idle = 0;
    const tick = () => {
      const energy = stepSim(
        nodesRef.current,
        linksRef.current,
        hiddenRef.current,
        posRef.current!,
        simRef.current!,
        dragRef.current,
      );
      paint();
      if (energy < 2 && !dragRef.current) {
        idle += 1;
        if (idle > 24) {
          runningRef.current = false;
          return;
        }
      } else {
        idle = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    wakeRef.current = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      idle = 0;
      raf = requestAnimationFrame(tick);
    };
    wakeRef.current();
    return () => {
      cancelAnimationFrame(raf);
      // StrictMode remonte l'effet en dev : sans ce reset, le réveil suivant
      // croit la boucle encore vivante et ne la relance jamais.
      runningRef.current = false;
    };
    // Montée unique : paint/ensurePos ne referment que des refs stables.
  }, []);

  // Molette → zoom autour du pointeur. Listener natif non-passif : React attache
  // wheel en passif, preventDefault y serait ignoré et la page défilerait.
  const hasGraph = nodes.length > 0;
  useEffect(() => {
    const svg = svgRef.current;
    if (!hasGraph || !svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const p = {
        x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
        y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
      };
      const v = viewRef.current;
      const next = clampZoom(v.zoom * Math.exp(-e.deltaY * 0.0015));
      v.pan = zoomAround(p, v.pan, v.zoom, next);
      v.zoom = next;
      applyView(viewGRef.current, v);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [hasGraph]);

  const hover = (id: string | null) => {
    hoveredRef.current = id;
    setHovered(id);
  };

  /** Client → coordonnée écran dans le viewBox (indépendante du zoom). */
  const toScreen = (clientX: number, clientY: number): Pos => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  };

  /** Client → coordonnée locale du graphe (tient compte du zoom/pan). */
  const toGraph = (clientX: number, clientY: number): Pos => {
    const { pan, zoom } = viewRef.current;
    return screenToGraph(toScreen(clientX, clientY), pan, zoom);
  };

  const onNodeDown = (e: ReactPointerEvent, id: string) => {
    e.stopPropagation();
    dragRef.current = id;
    movedRef.current = false;
    wakeRef.current();
  };

  /** Fond du graphe → déplacement de la vue (pan). */
  const onSvgDown = (e: ReactPointerEvent) => {
    const { pan } = viewRef.current;
    panRef.current = { cx: e.clientX, cy: e.clientY, px: pan.x, py: pan.y };
    movedRef.current = false;
  };

  const onSvgMove = (e: ReactPointerEvent) => {
    const id = dragRef.current;
    const start = panRef.current;
    if (!id && !start) return;
    // Capture différée au premier mouvement : capturée dès le pointerdown, elle
    // retargetterait le click sur le svg et ni la sélection ni la suppression
    // de lien n'atteindraient leur handler.
    svgRef.current?.setPointerCapture(e.pointerId);
    if (id) {
      posRef.current!.set(id, toGraph(e.clientX, e.clientY));
      movedRef.current = true;
      wakeRef.current();
      return;
    }
    if (!start) return;
    const rect = svgRef.current!.getBoundingClientRect();
    viewRef.current.pan = {
      x: start.px + ((e.clientX - start.cx) / rect.width) * VIEW_W,
      y: start.py + ((e.clientY - start.cy) / rect.height) * VIEW_H,
    };
    movedRef.current = true;
    applyView(viewGRef.current, viewRef.current);
  };

  const onSvgUp = () => {
    dragRef.current = null;
    panRef.current = null;
    wakeRef.current();
  };

  const onRecenter = () => {
    viewRef.current.zoom = 1;
    viewRef.current.pan = { x: 0, y: 0 };
    applyView(viewGRef.current, viewRef.current);
  };

  const onNodeClick = (id: string) => {
    if (movedRef.current) return; // clic après un drag = pas une sélection
    setSelection((sel) =>
      sel.includes(id) ? sel.filter((x) => x !== id) : [...sel.slice(-1), id],
    );
  };

  const onDelete = async (l: GraphLink) => {
    if (!isGM) return;
    const name = l.label ?? "sans libellé";
    if (!window.confirm(`Supprimer le lien « ${name} » ?`)) return;
    setBusy(true);
    setError(null);
    const res = await deleteLink({ campaignId, id: l.id });
    if (!res.ok) setError(res.error);
    setBusy(false);
  };

  const onCreate = async () => {
    if (!isGM || selection.length !== 2) return;
    setBusy(true);
    setError(null);
    const res = await createLink({
      campaignId,
      fromEntityId: selection[0],
      toEntityId: selection[1],
      label: label.trim(),
    });
    if (res.ok) {
      setLabel("");
      setSelection([]);
    } else {
      setError(res.error);
    }
    setBusy(false);
  };

  const types = [...new Set(nodes.map((n) => n.type))];
  const visible = nodes.filter((n) => !hidden.has(n.type));
  const visibleIds = new Set(visible.map((n) => n.id));
  const shownLinks = links.filter(
    (l) => visibleIds.has(l.fromEntityId) && visibleIds.has(l.toEntityId),
  );
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pairBlocked = selection.length !== 2 || hasLinkBetween(links, selection[0], selection[1]);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {/* Filtres par type */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
        <span className="text-muted" style={{ fontSize: "0.75rem", letterSpacing: "0.08em" }}>
          TYPES
        </span>
        {types.map((t) => (
          <button
            key={t}
            type="button"
            className="btn"
            aria-pressed={!hidden.has(t)}
            style={{
              padding: "0.3rem 0.7rem",
              fontSize: "0.7rem",
              opacity: hidden.has(t) ? 0.45 : 1,
            }}
            onClick={() =>
              setHidden((h) => {
                const next = new Set(h);
                if (next.has(t)) next.delete(t);
                else next.add(t);
                return next;
              })
            }
          >
            {t} ({nodes.filter((n) => n.type === t).length})
          </button>
        ))}
        <button
          type="button"
          className="btn"
          style={{ marginInlineStart: "auto", padding: "0.3rem 0.7rem", fontSize: "0.7rem" }}
          onClick={onRecenter}
        >
          Recentrer
        </button>
      </div>

      <div className="panel" style={{ padding: "0.5rem", background: "var(--background)" }}>
        {nodes.length === 0 ? (
          <p className="text-muted" style={{ padding: "2rem", textAlign: "center" }}>
            Aucune entité : créez des entités dans le wiki, leurs relations apparaîtront ici.
          </p>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
            onPointerDown={onSvgDown}
            onPointerMove={onSvgMove}
            onPointerUp={onSvgUp}
            onPointerLeave={onSvgUp}
          >
            {/* Groupe de vue : zoom + pan écrits directement par applyView(). */}
            <g ref={viewGRef}>
              {shownLinks.map((l) => {
                const on = hovered === l.id;
                const pa = base[l.fromEntityId] ?? { x: VIEW_W / 2, y: VIEW_H / 2 };
                const pb = base[l.toEntityId] ?? { x: VIEW_W / 2, y: VIEW_H / 2 };
                const c = curveControl(pa, pb);
                // Coordonnées d'entrée (stables) ; paint() prend le relais.
                const d = `M ${pa.x} ${pa.y} Q ${c.x} ${c.y} ${pb.x} ${pb.y}`;
                return (
                  <g key={l.id}>
                    <path
                      ref={(el) => {
                        if (el) edgeVis.current.set(l.id, el);
                        else edgeVis.current.delete(l.id);
                      }}
                      d={d}
                      fill="none"
                      stroke={on ? "var(--accent)" : "var(--muted)"}
                      strokeWidth={on ? 2 : 1.25}
                    />
                    <path
                      ref={(el) => {
                        if (el) edgeHit.current.set(l.id, el);
                        else edgeHit.current.delete(l.id);
                      }}
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      style={{ cursor: isGM ? "pointer" : "default" }}
                      onPointerEnter={() => hover(l.id)}
                      onPointerLeave={() => hover(null)}
                      onClick={() => {
                        if (isGM && !movedRef.current) void onDelete(l);
                      }}
                    />
                  </g>
                );
              })}

              {visible.map((n) => {
                const sel = selection.includes(n.id);
                const p = base[n.id] ?? { x: VIEW_W / 2, y: VIEW_H / 2 };
                return (
                  <g
                    key={n.id}
                    ref={(el) => {
                      if (el) nodeEls.current.set(n.id, el);
                      else nodeEls.current.delete(n.id);
                    }}
                    transform={`translate(${p.x} ${p.y})`}
                    style={{ cursor: "pointer" }}
                    onPointerDown={(e) => onNodeDown(e, n.id)}
                    onClick={() => onNodeClick(n.id)}
                  >
                    <title>{n.title}</title>
                    <rect
                      x={-NODE_W / 2}
                      y={-NODE_H / 2}
                      width={NODE_W}
                      height={NODE_H}
                      fill="var(--card)"
                      stroke={sel ? "var(--accent)" : "var(--border)"}
                      strokeWidth={sel ? 2.5 : 1}
                    />
                    <text
                      y={4}
                      textAnchor="middle"
                      fontSize={12}
                      fill="var(--foreground)"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {truncate(n.title, 16)}
                    </text>
                  </g>
                );
              })}

              {hovered && (
                <text
                  ref={labelRef}
                  x={VIEW_W / 2}
                  y={VIEW_H / 2}
                  textAnchor="middle"
                  fontSize={12}
                  fill="var(--accent)"
                  style={{ pointerEvents: "none" }}
                >
                  {links.find((l) => l.id === hovered)?.label ?? "sans libellé"}
                </text>
              )}
            </g>
          </svg>
        )}
      </div>

      {/* Création de lien — MJ uniquement */}
      {isGM && (
        <div
          className="panel"
          style={{
            padding: "0.75rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <span className="text-muted" style={{ fontSize: "0.85rem" }}>
            {selection.length === 0 && "Cliquez 2 entités pour créer un lien."}
            {selection.length === 1 && `Sélection : ${byId.get(selection[0])?.title} → …`}
            {selection.length === 2 &&
              `${byId.get(selection[0])?.title} → ${byId.get(selection[1])?.title}`}
            {pairBlocked && selection.length === 2 && " (déjà liées)"}
          </span>
          <input
            className="input"
            style={{ flex: "1 1 12rem", width: "auto" }}
            placeholder="Libellé (ex. « allié de »)"
            value={label}
            maxLength={80}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={pairBlocked || busy}
            onClick={() => void onCreate()}
          >
            Créer le lien
          </button>
          {error && (
            <span role="alert" style={{ color: "var(--accent)", fontSize: "0.85rem" }}>
              {error}
            </span>
          )}
        </div>
      )}
      {/* Le padding-bottom du scroller n'est pas compté en embed (cf. combat-app). */}
      <div aria-hidden className="h-8" />
    </div>
  );
}
