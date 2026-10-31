"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Filtres à soumission automatique : frappe debouncée (400 ms), changement de
 * liste immédiat, Entrée immédiate. `router.replace` garde le focus et ne
 * remplit pas l'historique.
 */
export function LibraryFilterForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const apply = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      const params = new URLSearchParams();
      for (const [key, value] of new FormData(form)) {
        const text = String(value).trim();
        if (text) params.set(key, text);
      }
      const query = params.toString();
      router.replace(query ? `/library?${query}` : "/library", { scroll: false });
    };

    const onInput = (e: Event) => {
      if ((e.target as HTMLElement).tagName === "SELECT") return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(apply, 400);
    };
    const onChange = (e: Event) => {
      if ((e.target as HTMLElement).tagName === "SELECT") apply();
    };
    const onSubmit = (e: Event) => {
      e.preventDefault();
      apply();
    };

    form.addEventListener("input", onInput);
    form.addEventListener("change", onChange);
    form.addEventListener("submit", onSubmit);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onChange);
      form.removeEventListener("submit", onSubmit);
    };
  }, [router]);

  return (
    <form ref={formRef} action="/library" method="get" className={className}>
      {children}
      {/* Bouton masqué : garde la soumission clavier et lecteur d'écran. */}
      <button type="submit" className="sr-only">
        Rechercher
      </button>
    </form>
  );
}
