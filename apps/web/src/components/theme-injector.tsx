"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCampaignTheme } from "@/features/theme/actions";

/**
 * Injecte le CSS custom de la campagne courante (Phase 9) via une balise
 * `<style>` — le contenu est sanitisé côté serveur à l'écriture ET à la
 * lecture (shared `sanitizeCss`). Le JS custom n'est jamais injecté ici :
 * il ne s'exécute que dans l'aperçu sandboxé des réglages de thème.
 *
 * Le thème est taggé par campagne : en dehors de `/campaign/[id]`,
 * l'id ne correspond plus et rien n'est rendu (pas de reset en effect).
 */
export function ThemeInjector() {
  const pathname = usePathname();
  const campaignId = pathname.startsWith("/campaign/") ? (pathname.split("/")[2] ?? "") : "";
  const [theme, setTheme] = useState<{ id: string; css: string }>({
    id: "",
    css: "",
  });

  useEffect(() => {
    if (!campaignId) return;
    let alive = true;
    getCampaignTheme(campaignId).then((r) => {
      if (alive) setTheme({ id: campaignId, css: r.css });
    });
    return () => {
      alive = false;
    };
  }, [campaignId]);

  const css = theme.id === campaignId ? theme.css : "";
  if (!css) return null;
  return <style data-aetheris-theme>{css}</style>;
}
