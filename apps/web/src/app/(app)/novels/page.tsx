import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function NovelsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="bar flex flex-1 flex-col gap-8 py-12">
      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Romans
        </h1>
        <p className="text-sm text-muted">Studio d&apos;écriture — bientôt.</p>
      </header>

      <p className="panel px-4 py-8 text-center text-sm text-muted">Module en construction.</p>
    </div>
  );
}
