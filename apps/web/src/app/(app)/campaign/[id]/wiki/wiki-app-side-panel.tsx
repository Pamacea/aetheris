"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { NoteBlock } from "@aetheris/shared";
import { BlocksPanel } from "./blocks-panel";
import { WikiAppBacklinks } from "./wiki-app-backlinks";
import type { WikiActiveNote, WikiGraphData, WikiNoteMeta } from "./wiki-app-types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <p className="p-4 text-xs text-muted">Chargement du graphe…</p>,
});

type SideTab = "backlinks" | "graph" | "blocks";

const SIDE_TABS: { id: SideTab; label: string }[] = [
  { id: "backlinks", label: "Liens entrants" },
  { id: "graph", label: "Graphe" },
  { id: "blocks", label: "Blocs" },
];

/** Panneau droit : backlinks, graphe de liens, blocs structurés. */
export function WikiAppSidePanel({
  campaignId,
  active,
  localNotes,
  backlinks,
  graph,
  isGM,
  blockLibrary,
  selectNote,
}: {
  campaignId: string;
  active: WikiActiveNote | null;
  localNotes: WikiNoteMeta[];
  backlinks: { id: string; title: string }[];
  graph: WikiGraphData;
  isGM: boolean;
  blockLibrary: NoteBlock[];
  selectNote: (id: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<SideTab>("backlinks");

  // force-graph ne mesure pas son conteneur (défaut = window.innerWidth) :
  // on lui passe la taille réelle du panneau via ResizeObserver.
  const graphBox = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = graphBox.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setGraphSize({
        w: Math.round(entry.contentRect.width),
        h: Math.round(entry.contentRect.height),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab]);

  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-card lg:flex">
      <div className="flex border-b border-border" role="tablist" aria-label="Panneau latéral">
        {SIDE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 text-[0.65rem] tracking-widest uppercase ${
              tab === t.id
                ? "border-b-2 border-accent text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "backlinks" && <WikiAppBacklinks backlinks={backlinks} selectNote={selectNote} />}

      {tab === "blocks" && (
        <BlocksPanel
          key={active?.id ?? "none"}
          campaignId={campaignId}
          noteId={active?.id ?? null}
          noteType={active?.type ?? ""}
          initialBlocks={active?.blocks ?? []}
          isGM={isGM}
          notes={localNotes}
          library={blockLibrary}
        />
      )}

      {tab === "graph" && (
        <div
          ref={graphBox}
          id="panel-graph"
          role="tabpanel"
          aria-labelledby="tab-graph"
          className="h-[420px] flex-1 overflow-hidden"
        >
          {graphSize.w > 0 && graphSize.h > 0 && (
            <ForceGraph2D
              width={graphSize.w}
              height={graphSize.h}
              graphData={graph}
              nodeId="id"
              nodeLabel="label"
              backgroundColor="rgba(0,0,0,0)"
              linkColor={() => "#4b3a2a"}
              linkDirectionalArrowLength={4}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const n = node as { x?: number; y?: number; label?: string; id?: string };
                if (n.x === undefined || n.y === undefined) return;
                const label = n.label ?? "";
                const r = 5;
                ctx.beginPath();
                ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
                ctx.fillStyle = n.id === active?.id ? "#c03a1b" : "#e7dcc6";
                ctx.fill();
                ctx.font = `${11 / globalScale}px Cinzel, serif`;
                ctx.textAlign = "center";
                ctx.fillStyle = "#9a8b74";
                ctx.fillText(label, n.x, n.y + 14 / globalScale);
              }}
              onNodeClick={(node) => {
                const id = (node as { id?: string }).id;
                if (id && id !== active?.id) void selectNote(id);
              }}
            />
          )}
        </div>
      )}
    </aside>
  );
}
