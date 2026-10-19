import { canViewModule } from "@/lib/grants";
import { MemberRoleSelect } from "./member-role-select";
import { ModuleViewToggle } from "./module-view-toggle";

/** Les onglets du hub (hors Réglages/Permissions) — un grant par module. */
const MODULES = [
  { id: "vtt", label: "Table" },
  { id: "wiki", label: "Wiki" },
  { id: "graph", label: "Graphe" },
  { id: "journal", label: "Journal" },
  { id: "choices", label: "Choix" },
  { id: "ambiance", label: "Ambiance" },
] as const;

interface MemberRow {
  id: string;
  role: string;
  permissions: unknown;
  user: { name: string; email: string };
}

/**
 * Liste des membres (page Permissions, MJ uniquement) : rôle modifiable,
 * et par joueur un toggle « voit » par module — le refus seul est persisté
 * (`CampaignMember.permissions.view`), le MJ voit toujours tout.
 */
export function PermissionsMembers({
  campaignId,
  members,
}: {
  campaignId: string;
  members: MemberRow[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
        <span className="mark-tri" aria-hidden />
        Membres ({members.length})
      </h2>
      <ul className="flex flex-col gap-3">
        {members.map((m) => {
          const isGM = m.role === "GM";
          return (
            <li key={m.id} className="panel flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="panel flex h-9 w-9 items-center justify-center text-xs text-accent"
                  >
                    {m.user.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted">{m.user.email}</p>
                  </div>
                </div>
                <MemberRoleSelect
                  key={m.role}
                  campaignId={campaignId}
                  memberId={m.id}
                  role={m.role}
                />
              </div>

              {isGM ? (
                <p className="text-xs text-muted">MJ — lit et modifie tous les modules.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {MODULES.map((mod) => {
                    const view = canViewModule(m.permissions, mod.id, m.role);
                    return (
                      <li
                        key={mod.id}
                        className="flex items-center justify-between gap-3 border border-border px-3 py-1.5 text-xs"
                      >
                        <span className={view ? "text-foreground" : "text-muted"}>{mod.label}</span>
                        <ModuleViewToggle
                          key={String(view)}
                          campaignId={campaignId}
                          memberId={m.id}
                          moduleId={mod.id}
                          label={mod.label}
                          initialView={view}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
