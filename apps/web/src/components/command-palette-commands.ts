import { signOut } from "@/lib/auth-client";
import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

export type PaletteEntry = { id: string; title: string };

export type Command = {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  /** En-tête de section dans la liste (undefined = commande racine sans groupe). */
  group?: string;
  run: () => void;
};

function entityCommands(
  entries: PaletteEntry[],
  router: Router,
  kind: "campaign" | "novel",
  group: string,
  hint: string,
  path: string,
  keywords: string,
): Command[] {
  return entries.map((entry) => ({
    id: `${kind}-${entry.id}`,
    label: entry.title,
    hint,
    group,
    keywords: `${keywords} ${entry.title}`,
    run: () => router.push(`/${path}/${entry.id}`),
  }));
}

// Implémentation partagée avec la wiki (évite la duplication) — API publique conservée.
export { fold } from "@/lib/text";

export function buildCommands(
  router: Router,
  campaigns: PaletteEntry[] = [],
  novels: PaletteEntry[] = [],
): Command[] {
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
      label: "Studio d'écriture",
      hint: "Navigation",
      keywords: "romans novels écriture studio",
      run: () => router.push("/novels"),
    },
    {
      id: "library",
      label: "Bibliothèque",
      hint: "Navigation",
      keywords: "bibliothèque library romans publiés lecture",
      run: () => router.push("/library"),
    },
    {
      id: "profile",
      label: "Profil",
      hint: "Navigation",
      keywords: "profil profile compte",
      run: () => router.push("/profile"),
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
    ...entityCommands(
      campaigns,
      router,
      "campaign",
      "Campagnes",
      "Campagne",
      "campaign",
      "campagne",
    ),
    ...entityCommands(novels, router, "novel", "Romans", "Roman", "novels", "roman"),
  ];
}
