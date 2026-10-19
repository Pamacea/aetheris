import { signOut } from "@/lib/auth-client";
import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

export type Command = {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  run: () => void;
};

// Implémentation partagée avec la wiki (évite la duplication) — API publique conservée.
export { fold } from "@/lib/text";

export function buildCommands(router: Router): Command[] {
  return [
    {
      id: "dashboard",
      label: "Tableau de bord",
      hint: "Navigation",
      keywords: "dashboard campagnes accueil",
      run: () => router.push("/dashboard"),
    },
    {
      id: "novels",
      label: "Romans",
      hint: "Navigation",
      keywords: "romans novels écriture studio",
      run: () => router.push("/novels"),
    },
    {
      id: "profile",
      label: "Profil",
      hint: "Navigation",
      keywords: "profil profile compte",
      run: () => router.push("/profile"),
    },
    {
      id: "builder",
      label: "Builder",
      hint: "Navigation",
      keywords: "builder atelier plugins macros systèmes modules",
      run: () => router.push("/builder"),
    },
    {
      id: "signout",
      label: "Se déconnecter",
      hint: "Session",
      keywords: "déconnexion deconnexion logout se déconnecter",
      run: async () => {
        await signOut();
        router.push("/");
        router.refresh();
      },
    },
  ];
}
