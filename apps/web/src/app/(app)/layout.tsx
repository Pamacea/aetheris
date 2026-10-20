import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { TopNav } from "@/components/top-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="w-full px-6 flex items-center justify-between gap-4 py-3">
          <Link
            href="/dashboard"
            aria-label="Aetheris"
            className="shrink-0 text-sm font-semibold tracking-[0.2em] uppercase"
          >
            <span className="mark-tri" aria-hidden />
            <span className="hidden sm:inline">Aetheris</span>
          </Link>

          <TopNav />
          <SignOutButton className="btn shrink-0 px-3 py-1.5 text-xs" />
        </div>
      </nav>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
