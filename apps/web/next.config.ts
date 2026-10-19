import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * Source unique de variables : le `.env` à la racine du monorepo
 * (injecté par shadow-secret). Cherché en remontant depuis cwd.
 */
function loadRootEnv(): void {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const file = path.join(dir, ".env");
    if (fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m) continue;
        const key = m[1];
        let value = m[2].trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

loadRootEnv();

/**
 * Origines WS autorisées pour `connect-src` (socket.io NestJS).
 * Raccourci : origines explicites déduites de NEXT_PUBLIC_WS_URL plutôt
 * qu'un `ws: wss:` ouvert à tout hôte — à élargir si le serveur WS
 * change d'origine.
 */
function wsConnectOrigins(): string {
  const raw = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3002";
  if (!/^https?:\/\//.test(raw)) return "";
  return ` ${raw} ${raw.replace(/^http/, "ws")}`;
}

/**
 * CSP stricte (Phase 9 — bac à sable des thèmes) :
 * - `script-src` sans 'unsafe-eval' en production (le build reste
 *   serviable via 'self' + inline d'hydration) ;
 * - `object-src 'none'` ;
 * - le CSS custom de campagne passe par un `<style>` sanitisé côté
 *   serveur (shared `sanitizeCss`) — pas de trusted-types, qui casserait
 *   le innerHTML de TipTap/React sans apporter de politique écrite.
 *
 * 'unsafe-eval' en dev seulement : React 19 appelle eval() en
 * development pour les owner stacks, sinon chaque page log une erreur
 * CSP au chargement. La build de production reste stricte.
 */
const scriptSrc =
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${wsConnectOrigins()}`,
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  transpilePackages: ["@aetheris/shared"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Miroir de `frame-ancestors 'self'` pour les navigateurs/lecteurs
          // qui n'appliquent pas la CSP (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Aucun média/sensor utilisé par l'app (VTT = canvas).
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
};

export default nextConfig;
