import Link from "next/link";
import { Fragment } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { CommandPalette } from "@/components/command-palette";

const NAV_LINKS = [
  { href: "/dashboard", label: "Campagnes" },
  { href: "/novels", label: "Romans" },
  { href: "/profile", label: "Profil" },
  { href: "/builder", label: "Builder" },
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-6 py-3 md:w-2/3">
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
                {i === 1 && (
                  <span aria-hidden className="mx-1.5 select-none text-sm text-accent/70">
                    ❦
                  </span>
                )}
              </Fragment>
            ))}
            <span className="ml-8 flex items-center">
              <CommandPalette />
            </span>
            {session && <SignOutButton className="btn px-3 py-1.5 text-xs" />}
          </div>
        </div>
      </nav>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
