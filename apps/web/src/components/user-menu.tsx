"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Chargé au clic : la modale de dons ne fait pas partie du bundle de la top bar.
const DonationModal = dynamic(
  () => import("@/components/donation/DonationModal").then((m) => m.DonationModal),
  { ssr: false },
);

const MENU_ITEMS = [
  { href: "/profile#compte", label: "Profil" },
  { href: "/profile#appearance", label: "Thèmes" },
  { href: "/profile#shortcuts", label: "Raccourcis" },
] as const;

/**
 * Avatar + menu déroulant du compte. Chaque entrée mène à une section
 * de /profile : pas de route fictive.
 */
export function UserMenu({
  user,
}: {
  user?: { name?: string | null; email?: string | null } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const label = user?.name || user?.email || "Compte";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // L'entrée du menu disparaît à l'ouverture : on rend le focus à l'avatar.
  function closeDonation() {
    setDonationOpen(false);
    triggerRef.current?.focus();
  }

  async function handleSignOut() {
    setOpen(false);
    // Chargé au clic : le SDK d'auth n'entre pas dans le bundle global.
    const { signOut } = await import("@/lib/auth-client");
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div ref={rootRef} className="relative shrink-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? "user-menu" : undefined}
          aria-label={`Menu du compte : ${label}`}
          className="group relative flex h-9 w-9 shrink-0 items-center justify-center text-foreground focus-visible:outline-none"
        >
          {/* Losange brisé : deux polygones concentriques font l'arête. */}
          <span
            aria-hidden
            className="absolute inset-0 bg-border transition-colors group-hover:bg-accent group-focus-visible:bg-accent [clip-path:polygon(50%_0,100%_38%,78%_100%,12%_90%,0_30%)]"
          />
          <span
            aria-hidden
            className="absolute inset-[2px] bg-card transition-colors group-hover:bg-card-hover [clip-path:polygon(50%_0,100%_38%,78%_100%,12%_90%,0_30%)]"
          />
          <span
            className="mark-tri relative z-10 text-base"
            style={{ marginRight: 0 }}
            aria-hidden
          />
        </button>

        {open && (
          <div
            id="user-menu"
            role="menu"
            aria-label="Menu du compte"
            className="panel absolute right-0 top-full z-50 mt-2 w-56 p-1"
          >
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium">{label}</p>
              {user?.email && <p className="truncate text-xs text-muted">{user.email}</p>}
            </div>

            {MENU_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm text-muted hover:bg-card-hover hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setDonationOpen(true);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-muted hover:bg-card-hover hover:text-foreground"
            >
              Soutenir Aetheris
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="block w-full px-3 py-2 text-left text-sm text-muted hover:bg-card-hover hover:text-foreground"
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>
      {donationOpen && <DonationModal open onClose={closeDonation} />}
    </>
  );
}
