import type { SceneState } from "@aetheris/shared";
import type { Dispatch, SetStateAction } from "react";
import type { Application, Container, Graphics, Sprite } from "pixi.js";
import type { CampaignSocket } from "@/lib/ws";
import type { VttModalsProps } from "./vtt-modals";

/**
 * Table de jeu (Phase 5) — canvas PixiJS v8.
 *
 * Scène en calques empilés (bas → haut) :
 *   Fond → Grille → Tokens → Lumière/Ombre → Murs → Brouillard
 * Le conteneur `world` porte le pan/zoom (caméra) ; l'overlay reste en
 * espace écran. État de la scène local pour l'instant (sync Phase 6).
 *
 * Brouillard : un Graphics plein recouvre la zone, les polygones de vision
 * (raycasting tronqué aux murs) sont percés via `Graphics.cut()`.
 */
export type VttTool = "select" | "pan" | "grid" | "token" | "wall" | "fog";

export type GridType = "square" | "hex" | "none";

export interface GridSettings {
  type: GridType;
  size: number; // carrée : côté de cellule ; hex : rayon
  offsetX: number;
  offsetY: number;
}

/** Token de scène (état local — sync Phase 6). Position = centre, en coords monde. */
export interface TokenState {
  id: string;
  x: number;
  y: number;
  size: number; // diamètre en px monde
  rot: number; // degrés
  name: string;
  color: string; // #rrggbb
  hp: number | null;
  hpMax: number | null;
  /** Note wiki à l'origine du token (drag & drop depuis la palette Lore). */
  noteId?: string | null;
}

/** Tracé de mur : polyigne de sommets snappés (bloque la ligne de vue). */
export type WallLine = { x: number; y: number }[];

/** Points du brouillard / murs. */
export interface VttPoint {
  x: number;
  y: number;
}

export interface VttApi {
  setGrid: (g: GridSettings) => void;
  setMap: (url: string | null) => void;
  setTokens: (list: TokenState[], selectedId: string | null) => void;
  setWalls: (list: WallLine[]) => void;
  setFog: (on: boolean, sightCells: number) => void;
  finishDraft: () => void;
  cancelDraft: () => void;
  /** Drop d'une note wiki (palette Lore) : crée un token lié à `noteId`. */
  dropNote: (noteId: string, title: string, screenX: number, screenY: number) => void;
}

export const TOOLS: { id: VttTool; label: string; hint: string; gmOnly: boolean }[] = [
  { id: "select", label: "Curseur", hint: "Sélection et déplacement", gmOnly: false },
  { id: "pan", label: "Vue", hint: "Glisser pour déplacer la caméra", gmOnly: false },
  { id: "grid", label: "Grille", hint: "Carte, type, taille et offset", gmOnly: true },
  { id: "token", label: "Tokens", hint: "Créer et manipuler des tokens", gmOnly: true },
  { id: "wall", label: "Murs", hint: "Dessiner les murs (ligne de vue)", gmOnly: true },
  { id: "fog", label: "Brouillard", hint: "Révéler / masquer la carte", gmOnly: true },
];

export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.1;
export const DEFAULT_CELLS = 30;
export const GRID_COLOR = 0x4b3a2a;
export const TOKEN_COLORS = ["#c03a1b", "#3a6ea5", "#5a9d4f", "#b8860b", "#7b4fa0"];

/** Derniers réglages lus par l'init Pixi (asynchrone) et rejoués si besoin. */
export interface VttSettings {
  grid: GridSettings;
  mapUrl: string | null;
  walls: WallLine[];
  fogOn: boolean;
  sightCells: number;
  tokens: TokenState[];
  selectedId: string | null;
}

/**
 * État mutable partagé par la scène Pixi (ex-closures de l'effet React) :
 * créé avant l'init, rempli par la scène puis lu par les modules dessin/drag.
 */
export interface VttSceneCtx {
  instance: Application;
  world: Container;
  fond: Container;
  tokensLayer: Container;
  gridGfx: Graphics;
  wallGfx: Graphics;
  draftGfx: Graphics;
  fogGfx: Graphics;
  mapSprite: Sprite | null;
  mapToken: number;
  gridSettings: GridSettings;
  tokenStates: TokenState[];
  selectedToken: string | null;
  wallStates: WallLine[];
  fogEnabled: boolean;
  sightCells: number;
  draft: VttPoint[];
  draftCursor: VttPoint | null;
  fogPending: boolean;
  /** true une fois la scène détruite (nettoyage de l'effet React). */
  disposed: boolean;
}

/**
 * Liaison React → Pixi : uniquement des setters et des refs (tous stables),
 * capturée une seule fois par l'effet de montage de la scène.
 */
export interface VttBridge {
  apiRef: { current: VttApi | null };
  toolRef: { current: VttTool };
  wsRef: { current: { socket: CampaignSocket; campaignId: string } | null };
  settingsRef: { current: VttSettings };
  setTokens: Dispatch<SetStateAction<TokenState[]>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setWalls: Dispatch<SetStateAction<WallLine[]>>;
  setDraftCount: Dispatch<SetStateAction<number>>;
  setZoom: Dispatch<SetStateAction<number>>;
  setFicheTokenId: Dispatch<SetStateAction<string | null>>;
  setLoreNoteId: Dispatch<SetStateAction<string | null>>;
}

export interface VttAppProps {
  isGM: boolean;
  campaignId: string;
  /** État persisté (Phase 6) — null = scène neuve. */
  initialScene?: SceneState | null;
  /** Entities de la campagne — liaison token → fiche (palette + sélecteur). */
  notes: { id: string; title: string; folder: string | null }[];
  /** Modales Combat / Ambiance / Macros (W4) — états initiaux de la page. */
  modals?: VttModalsProps;
}
