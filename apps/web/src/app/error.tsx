"use client";

import { useEffect, useRef } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Le focus part sinon sur <body> : on le pose sur le titre de l'erreur.
    titleRef.current?.focus();
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <section role="alert" aria-labelledby="error-title" className="panel panel-form p-8">
        <h1 id="error-title" ref={titleRef} tabIndex={-1} className="text-2xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Une erreur est survenue
        </h1>
        <p className="mt-4 text-sm text-muted">
          Le contenu n&apos;a pas pu être chargé. Vous pouvez réessayer.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted">Référence : {error.digest}</p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="btn btn-primary btn-broken mt-6 w-full"
        >
          Réessayer
        </button>
      </section>
    </div>
  );
}
