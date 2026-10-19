import Link from "next/link";
import { canViewModule } from "@/lib/grants";

const MODULES = [
  {
    slug: "wiki",
    path: "wiki",
    label: "Lore Wiki",
    description: "Notes interconnectées, liens [[bidirectionnels]], graphe",
    ready: true,
  },
  {
    slug: "vtt",
    path: "vtt",
    label: "Table de jeu",
    description: "Cartes, tokens, grille, brouillard de guerre",
    ready: true,
  },
  {
    slug: "chat",
    path: "vtt",
    label: "Chat & Dés",
    description: "Theatre of the Mind, jets de dés, temps réel",
    ready: true,
  },
  {
    slug: "ambiance",
    path: "ambiance",
    label: "Ambiance sonore",
    description: "Playlists par scène, audio synchronisé",
    ready: true,
  },
] as const;

export function CampaignModules({
  id,
  enabledPlugins,
  permissions,
  role,
  isGM,
}: {
  id: string;
  enabledPlugins: string[];
  permissions: unknown;
  role: string;
  isGM: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
        <span className="mark-tri" aria-hidden />
        Modules
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {MODULES.map((m) => {
          // carte grée par plugin : non activé ou grant retiré → pas de 404
          const active =
            (m.slug !== "ambiance" || enabledPlugins.includes("ambiance")) &&
            canViewModule(permissions, m.slug, role);
          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{m.label}</span>
              </div>
              <p className="text-xs text-muted">{m.description}</p>
              <span
                className={`mt-auto text-xs ${
                  !active ? "text-muted" : m.ready ? "text-accent" : "text-accent/70"
                }`}
              >
                {!active
                  ? isGM
                    ? "Inactif — activer ↓"
                    : "Indisponible"
                  : m.ready
                    ? "Ouvrir →"
                    : "Bientôt disponible"}
              </span>
            </>
          );
          return (
            <li key={m.slug}>
              {m.ready && active ? (
                <Link
                  href={`/campaign/${id}/${m.path}`}
                  className="panel flex h-full flex-col gap-2 p-4 hover:bg-card-hover"
                >
                  {body}
                </Link>
              ) : (
                <a
                  href="#modules-etendus"
                  className="panel flex h-full flex-col gap-2 p-4 hover:bg-card-hover"
                >
                  {body}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
