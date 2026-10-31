import type { ReactNode, SVGProps } from "react";

/**
 * Icônes SVG inline (aucune dépendance). Trait `currentColor`, taille 14 px
 * par défaut — reprend le style de `chapter-editor-toolbar.tsx`.
 */
function Icon({ className = "h-3.5 w-3.5", children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      {children as ReactNode}
    </svg>
  );
}

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
      <path d="M9.5 4.5l2 2" />
    </Icon>
  );
}

export function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.4l2.2 1.4" />
    </Icon>
  );
}

export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="11.5" cy="3.5" r="1.8" />
      <circle cx="4.5" cy="8" r="1.8" />
      <circle cx="11.5" cy="12.5" r="1.8" />
      <path d="M6.1 7.1l3.8-2.2M6.1 8.9l3.8 2.2" />
    </Icon>
  );
}

export function LayoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="2.5" width="11" height="11" />
      <path d="M2.5 6h11M6.5 6v7.5" />
    </Icon>
  );
}

export function BlocksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M8 1.8L1.8 5v6L8 14.2 14.2 11V5L8 1.8z" />
      <path d="M1.8 5L8 8.2 14.2 5" />
      <path d="M8 8.2v6" />
    </Icon>
  );
}

/** Outils de la table de jeu (barre inférieure, icônes seules). */
export function CursorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3.2 2.2l9.4 5.9-4.1.9-1.7 4.1L3.2 2.2z" />
    </Icon>
  );
}

export function PanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M8 2.5v11M2.5 8h11" />
      <path d="M6.2 4.3L8 2.5l1.8 1.8M6.2 11.7L8 13.5l1.8-1.8M4.3 6.2L2.5 8l1.8 1.8M11.7 6.2L13.5 8l-1.8 1.8" />
    </Icon>
  );
}

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="2.5" width="11" height="11" />
      <path d="M2.5 6.2h11M2.5 9.8h11M6.2 2.5v11M9.8 2.5v11" />
    </Icon>
  );
}

export function TokenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="5.4" r="2.2" />
      <path d="M3.6 13.5c0-2.6 2-4.3 4.4-4.3s4.4 1.7 4.4 4.3" />
    </Icon>
  );
}

export function WallIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="5" width="11" height="6" />
      <path d="M7 5v3M10 8v3M5 8v3M2.5 8h2.5M7 8h3M12 5v3" />
    </Icon>
  );
}

export function FogIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4.4 10.8h7a2.4 2.4 0 000-4.8 3.4 3.4 0 00-6.4-.7 2.7 2.7 0 00-.6 5.5z" />
      <path d="M3.5 13h9" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M10 3.5L5.5 8 10 12.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 3.5L10.5 8 6 12.5" />
    </Icon>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
    </Icon>
  );
}

export function PaletteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M8 1.8a6.2 6.2 0 000 12.4c1.2 0 1.8-.9 1.8-1.8 0-1.1-.8-1.7-1.8-1.7h-.4c-1 0-1.5-.6-1.5-1.4 0-1 .7-1.6 1.8-1.6h1.4a3.7 3.7 0 003.7-3.7c0-1.3-2.2-2.2-5-2.2z" />
      <circle cx="5.2" cy="6.2" r=".7" />
      <circle cx="7.4" cy="4.4" r=".7" />
      <circle cx="10" cy="5.1" r=".7" />
    </Icon>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M1.5 8s2.3-4 6.5-4 6.5 4 6.5 4-2.3 4-6.5 4S1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="1.8" />
    </Icon>
  );
}

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M2 2l12 12" />
      <path d="M6.5 4.3A7.5 7.5 0 018 4c4.2 0 6.5 4 6.5 4a11 11 0 01-2.3 2.6M4 5.2C2.4 6.4 1.5 8 1.5 8s2.3 4 6.5 4c1 0 1.9-.2 2.7-.6" />
      <path d="M6.7 6.7a1.8 1.8 0 002.6 2.6" />
    </Icon>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
      <path d="M6.8 7v3.5M9.2 7v3.5" />
    </Icon>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M8 3v10M3 8h10" />
    </Icon>
  );
}

export function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6.5 9.5l3-3" />
      <path d="M8.6 5.4L10 4a2.4 2.4 0 013.4 3.4l-1.4 1.4" />
      <path d="M7.4 10.6L6 12a2.4 2.4 0 01-3.4-3.4L4 7.2" />
    </Icon>
  );
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="5.5" y="5.5" width="8" height="8" />
      <path d="M10.5 5.5v-3h-8v8h3" />
    </Icon>
  );
}

export function SwordIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M13 2.5L7.5 8 8 9.5 6.5 11 5 9.5 3.5 11 5 12.5 3 14.5" />
      <path d="M8.5 6.5l1.5 1.5" />
    </Icon>
  );
}

export function SkullIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M8 1.8c-3 0-5 2.2-5 5 0 1.7.8 3 2 3.8V13h6v-2.4c1.2-.8 2-2.1 2-3.8 0-2.8-2-5-5-5z" />
      <circle cx="6.2" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.8" cy="7" r="1" fill="currentColor" stroke="none" />
      <path d="M6.8 10.5v2M9.2 10.5v2" />
    </Icon>
  );
}

export function RocketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M9 2.5c2.4.6 4 2.2 4.5 4.6l-5.4 5.4-3.1-3.1L9 2.5z" />
      <path d="M5 9.4L2.5 12M6.6 11l-1.2 2.5M3.5 7.9L6 6.7" />
      <circle cx="10" cy="6" r="1" />
    </Icon>
  );
}

export function FeatherIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M13 3c-4 0-7 3-7 7v3l3-3c4 0 4-4 4-7z" />
      <path d="M3 13.5L9 7.5" />
    </Icon>
  );
}
