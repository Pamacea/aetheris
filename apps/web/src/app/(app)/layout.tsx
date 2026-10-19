import Link from "next/link";
import { Fragment } from "react";
import { SignOutButton } from "@/components/sign-out-button";

const NAV_LINKS = [
  { href: "/dashboard", label: "Campagnes" },
  { href: "/novels", label: "Romans" },
  { href: "/profile", label: "Profil" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="bar flex items-center justify-between gap-4 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-[0.2em] uppercase">
            <span className="mark-tri" aria-hidden />
            Aetheris
          </Link>

          <div className="flex items-center gap-3">
            {NAV_LINKS.map((link, i) => (
              <Fragment key={link.href}>
                <Link
                  href={link.href}
                  className="btn border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
                {i === 0 && (
                  <span aria-hidden className="mx-1.5 select-none text-sm text-accent/70">
                    ❦
                  </span>
                )}
              </Fragment>
            ))}
            <SignOutButton className="btn ml-4 px-3 py-1.5 text-xs" />
          </div>
        </div>
      </nav>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
