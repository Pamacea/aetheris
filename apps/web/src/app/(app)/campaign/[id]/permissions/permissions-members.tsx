import { PLUGIN_CATALOG } from "@aetheris/shared";
import { canViewModule } from "@/lib/grants";
import { MemberRoleSelect } from "./member-role-select";
import { ModuleViewToggle } from "./module-view-toggle";

const CORE_MODULES = [
  { id: "wiki", label: "Lore Wiki" },
  { id: "vtt", label: "Table de jeu" },
  { id: "chat", label: "Chat & Dés" },
] as const;

export function PermissionsMembers({
  campaignId,
  enabledPlugins,
  isGM,
  members,
}: {
  campaignId: string;
  enabledPlugins: string[];
  isGM: boolean;
  members: {
    id: string;
    role: string;
    permissions: unknown;
    user: { name: string; email: string };
  }[];
}) {
  const modules = [
    ...CORE_MODULES.map((m) => ({ id: m.id, label: m.label, available: true, core: true })),
    ...PLUGIN_CATALOG.map((p) => ({
      id: p.id,
      label: p.name,
      available: enabledPlugins.includes(p.id),
      core: false,
    })),
  ];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
        <span className="mark-tri" aria-hidden />
        Membres ({members.length})
      </h2>
      <p className="text-xs text-muted">
        « voit » = module consultable (cœur toujours actif, plugins selon l&apos;activation de la
        campagne) ; « modifie » = réservé au MJ.
      </p>
      <ul className="flex flex-col gap-3">
        {members.map((m) => {
          const memberIsGM = m.role === "GM";
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
                {isGM ? (
                  <MemberRoleSelect
                    key={m.role}
                    campaignId={campaignId}
                    memberId={m.id}
                    role={m.role}
                    disabled={false}
                  />
                ) : (
                  <span className="border border-border px-2 py-0.5 text-[0.65rem] tracking-widest text-muted uppercase">
                    {memberIsGM ? "MJ" : "Joueur"}
                  </span>
                )}
              </div>

              <ul className="grid gap-2 sm:grid-cols-2">
                {modules.map((mod) => {
                  const canView = canViewModule(m.permissions, mod.id, m.role);
                  const canEdit = mod.available && memberIsGM;
                  // Plugin du campagne éditable par le MJ sur un joueur ;
                  // cœur et MJ : figés (cœur toujours actif, MJ lit tout).
                  const grantEditable = isGM && !mod.core && !memberIsGM && mod.available;
                  return (
                    <li
                      key={mod.id}
                      className="flex items-center justify-between gap-3 border border-border px-3 py-1.5 text-xs"
                    >
                      <span className={canView ? "text-foreground" : "text-muted"}>
                        {mod.label}
                        {!mod.available && (
                          <span className="ml-2 text-[0.6rem] tracking-widest text-muted uppercase">
                            campagne off
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-3">
                        {grantEditable ? (
                          <ModuleViewToggle
                            campaignId={campaignId}
                            memberId={m.id}
                            moduleId={mod.id}
                            label={mod.label}
                            initialView={canView}
                          />
                        ) : (
                          <label className="flex items-center gap-1.5 text-muted">
                            <input
                              type="checkbox"
                              name={`module-${mod.id}-consultation`}
                              checked={canView}
                              readOnly
                              disabled
                              aria-label={`${mod.label} : consultation`}
                              className="accent-accent"
                            />
                            voit
                          </label>
                        )}
                        <label className="flex items-center gap-1.5 text-muted">
                          <input
                            type="checkbox"
                            name={`module-${mod.id}-modification`}
                            checked={canEdit}
                            readOnly
                            disabled
                            aria-label={`${mod.label} : modification`}
                            className="accent-accent"
                          />
                          modifie
                        </label>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
