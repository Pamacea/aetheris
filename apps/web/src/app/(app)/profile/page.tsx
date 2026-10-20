import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="w-full px-6 flex flex-1 flex-col gap-8 py-12">
      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Profil
        </h1>
        <p className="text-sm text-muted">Votre compte Aetheris.</p>
      </header>

      <section className="panel flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="min-w-0">
          <p className="truncate text-lg font-medium">{session.user.name}</p>
          <p className="truncate text-sm text-muted">{session.user.email}</p>
        </div>
        <SignOutButton className="btn px-4 py-2 text-xs" />
      </section>
    </div>
  );
}
