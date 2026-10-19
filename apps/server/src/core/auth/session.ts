import type { IncomingHttpHeaders } from "node:http";

/** Nom du cookie de session Better Auth (défaut du framework). */
export const SESSION_COOKIE = "better-auth.session_token";

/**
 * Better Auth stocke un cookie *signé* : `token.signature` (URL-encodé).
 * La base ne contient que le token brut (32 chars) → on coupe au premier `.`.
 */
function stripSignature(value: string): string {
  const dot = value.indexOf(".");
  return dot === -1 ? value : value.slice(0, dot);
}

/**
 * Extrait le token de session Better Auth d'une requête HTTP ou d'un
 * handshake Socket.io : cookie d'abord, puis `Authorization: Bearer`.
 */
export function parseSessionToken(
  headers: Pick<IncomingHttpHeaders, "cookie" | "authorization">,
): string | undefined {
  const auth = headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token.length > 0) return stripSignature(token);
  }

  const cookie = headers.cookie;
  if (typeof cookie === "string") {
    for (const part of cookie.split(";")) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      if (part.slice(0, eq).trim() === SESSION_COOKIE) {
        const value = part.slice(eq + 1).trim();
        if (value.length > 0) return stripSignature(decodeURIComponent(value));
      }
    }
  }

  return undefined;
}
