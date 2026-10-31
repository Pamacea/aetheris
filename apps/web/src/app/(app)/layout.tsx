import Link from "next/link";
import { EmbedMode } from "@/components/campaigns/embed-mode";
import { CommandPalette } from "@/components/command-palette";
import { ToastProvider } from "@/components/toast";
import { TopNav } from "@/components/top-nav";
import { UserMenu } from "@/components/user-menu";
import { loadPaletteData } from "@/features/command-palette/palette-data";
import { getSession } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const paletteData = session
    ? await loadPaletteData(session.user.id)
    : { campaigns: [], novels: [] };

  return (
    <ToastProvider>
      <EmbedMode />
      <div className="flex min-h-screen flex-col">
        <nav
          data-app-chrome
          className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur"
        >
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
            <CommandPalette campaigns={paletteData.campaigns} novels={paletteData.novels} />
            <UserMenu
              user={session ? { name: session.user.name, email: session.user.email } : null}
            />
          </div>
        </nav>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </ToastProvider>
  );
}
