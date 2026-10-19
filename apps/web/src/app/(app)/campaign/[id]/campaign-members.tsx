export function CampaignMembers({
  members,
  isGM,
  inviteCode,
}: {
  members: { id: string; role: string; user: { name: string; email: string } }[];
  isGM: boolean;
  inviteCode: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
        <span className="mark-tri" aria-hidden />
        Membres ({members.length})
      </h2>
      <ul className="panel divide-y divide-border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="panel flex h-8 w-8 items-center justify-center text-xs text-accent"
              >
                {m.user.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-medium">{m.user.name}</p>
                <p className="text-xs text-muted">{m.user.email}</p>
              </div>
            </div>
            <span className="border border-border px-2 py-0.5 text-[0.65rem] tracking-widest text-muted uppercase">
              {m.role === "GM" ? "MJ" : "Joueur"}
            </span>
          </li>
        ))}
      </ul>
      {isGM && (
        <p className="text-xs text-muted">
          Code d&apos;invitation :{" "}
          <code className="border border-border px-2 py-0.5 tracking-wider text-foreground">
            {inviteCode}
          </code>
        </p>
      )}
    </section>
  );
}
