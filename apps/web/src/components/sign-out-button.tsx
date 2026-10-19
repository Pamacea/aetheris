"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      className={className ?? "btn"}
    >
      Se déconnecter
    </button>
  );
}
