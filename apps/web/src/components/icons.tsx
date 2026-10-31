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

export function DiceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <circle cx="5.6" cy="5.6" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="10.4" cy="5.6" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="5.6" cy="10.4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="10.4" cy="10.4" r="0.8" fill="currentColor" stroke="none" />
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
