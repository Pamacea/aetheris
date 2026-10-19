const KEY_LEFT = "aetheris:panel:left";
const KEY_RIGHT = "aetheris:panel:right";
const KEY_LEFT_COLLAPSED = "aetheris:panel:left:collapsed";
const KEY_RIGHT_COLLAPSED = "aetheris:panel:right:collapsed";
const DEFAULT_LEFT = 260;
const DEFAULT_RIGHT = 300;
export const MIN_WIDTH = 180;
export const MAX_WIDTH = 460;

type Panels = {
  left: number;
  right: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
};

/** Petit store localStorage partagé : lecture paresseuse + notify au drag. */
const listeners = new Set<() => void>();
let cache: Panels | undefined;

function readWidth(key: string, fallback: number): number {
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? Math.min(MAX_WIDTH, Math.max(0, n)) : fallback;
}

function readCollapsed(key: string): boolean {
  return window.localStorage.getItem(key) === "true";
}

export function getSnapshot(): Panels {
  cache ??= {
    left: readWidth(KEY_LEFT, DEFAULT_LEFT),
    right: readWidth(KEY_RIGHT, DEFAULT_RIGHT),
    leftCollapsed: readCollapsed(KEY_LEFT_COLLAPSED),
    rightCollapsed: readCollapsed(KEY_RIGHT_COLLAPSED),
  };
  return cache;
}

const SERVER_SNAPSHOT: Panels = {
  left: DEFAULT_LEFT,
  right: DEFAULT_RIGHT,
  leftCollapsed: false,
  rightCollapsed: false,
};

export function getServerSnapshot(): Panels {
  return SERVER_SNAPSHOT;
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function persist(next: Panels): void {
  cache = next;
  window.localStorage.setItem(KEY_LEFT, String(next.left));
  window.localStorage.setItem(KEY_RIGHT, String(next.right));
  window.localStorage.setItem(KEY_LEFT_COLLAPSED, String(next.leftCollapsed));
  window.localStorage.setItem(KEY_RIGHT_COLLAPSED, String(next.rightCollapsed));
  listeners.forEach((l) => l());
}
