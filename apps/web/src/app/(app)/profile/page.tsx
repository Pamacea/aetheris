import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";

const PROVIDER_LABELS: Record<string, string> = {
  discord: "Discord",
  github: "GitHub",
  emailAndPassword: "Email & mot de passe",
  credential: "Email & mot de passe",
  "email-password": "Email & mot de passe",
};

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { accounts: { select: { providerId: true } } },
  });
  if (!user) redirect("/login");

  const providers = user.accounts.map((a) => PROVIDER_LABELS[a.providerId] ?? a.providerId);

  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-8 px-6 py-12 md:w-2/3">
      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Profil
        </h1>
        <p className="text-sm text-muted">
          Membre depuis le {user.createdAt.toLocaleDateString("fr-FR")}
        </p>
      </header>

      <section className="panel flex items-center gap-5 p-6">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center border border-border bg-card-hover text-2xl text-accent"
          aria-hidden
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-full w-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-medium">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-muted">
            {user.emailVerified ? (
              <span className="text-accent">Email vérifié</span>
            ) : (
              "Email non vérifié"
            )}
            {providers.length > 0 && <> · {providers.join(" · ")}</>}
          </p>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="mb-4 text-xs font-medium tracking-[0.25em] text-muted uppercase">
          <span className="mark-tri" aria-hidden />
          Informations
        </h2>
        <ProfileForm initialName={user.name} />
      </section>
    </div>
  );
}
