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
          aria-label={session ? undefined : "Navigation principale"}
          className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur"
        >
          <div className="w-full px-6 flex items-center justify-between gap-4 py-3">
            <Link
              href={session ? "/dashboard" : "/"}
              aria-label="Aetheris"
              className="shrink-0 text-sm font-semibold tracking-[0.2em] uppercase"
            >
              <span className="mark-tri" aria-hidden />
              <span className="hidden sm:inline">Aetheris</span>
            </Link>

            {session ? (
              <>
                <TopNav />
                <CommandPalette campaigns={paletteData.campaigns} novels={paletteData.novels} />
                <UserMenu user={{ name: session.user.name, email: session.user.email }} />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/library"
                  className="btn border-transparent px-2 py-1.5 text-xs text-muted hover:text-foreground sm:px-3"
                >
                  Bibliothèque
                </Link>
                <Link
                  href="/login"
                  className="btn border-transparent px-2 py-1.5 text-xs text-muted hover:text-foreground sm:px-3"
                >
                  Se connecter
                </Link>
                <Link href="/register" className="btn btn-primary">
                  Créer un compte
                </Link>
              </div>
            )}
          </div>
        </nav>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </ToastProvider>
  );
}
