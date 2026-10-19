import { NextResponse, type NextRequest } from "next/server";

/**
 * Rate-limit en mémoire sur `/api/auth/*` (inscription, connexion, OAuth).
 * Sans nouvelle dépendance : fenêtre glissante ip → horodatages.
 * Next 16 a renommé `middleware` en `proxy` (déprécié, toujours lu) :
 * renommer en `src/proxy.ts` + `export function proxy` au prochain passage.
 *
 * shortcut: quota unique (pas de cloisonnement sign-in / découverte de
 * compte) et stockage par process — remis à zéro au redémarrage, inutile
 * derrière plusieurs instances. Baisser `MAX` pour les routes `/sign-in*`
 * si le bruteforce devient un sujet réel.
 */
const WINDOW_MS = 60_000;
const MAX = 100;

const hits = new Map<string, number[]>();

function overLimit(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  // Éviction paresseuse : la carte ne grossit que si beaucoup d'IP distinctes.
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return request.headers.get("x-real-ip") ?? "local";
}

export function middleware(request: NextRequest) {
  const now = Date.now();
  if (overLimit(clientKey(request), now)) {
    return new NextResponse("Trop de requêtes", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(WINDOW_MS / 1000)) },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
