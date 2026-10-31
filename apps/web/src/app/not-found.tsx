import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <section className="panel panel-form p-8">
        <p className="text-[0.7rem] tracking-[0.3em] text-accent uppercase">
          <span className="mark-tri" aria-hidden />
          404
        </p>
        <h1 className="mt-3 text-2xl tracking-wide">Page introuvable</h1>
        <p className="mt-4 text-sm text-muted">
          La page demandée n&apos;existe pas ou a été déplacée.
        </p>
        <Link href="/" className="btn btn-primary btn-broken mt-6 w-full">
          Retour à l&apos;accueil
        </Link>
      </section>
    </div>
  );
}
