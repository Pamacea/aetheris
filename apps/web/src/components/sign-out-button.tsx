"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Se déconnecter"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      className={className ?? "btn"}
    >
      {/* Compact sous md : la top bar mobile laisse la place aux modules. */}
      <span className="md:hidden">Sortir</span>
      <span className="hidden md:inline">Se déconnecter</span>
    </button>
  );
}
