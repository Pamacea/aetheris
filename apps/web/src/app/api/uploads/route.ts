import { list, put } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, UPLOAD_MESSAGES, validateUpload } from "@/lib/upload-validation";

export const runtime = "nodejs";

const BLOB_QUOTA_BYTES = 200 * 1024 * 1024;
const BLOB_QUOTA_FILES = 500;

const NO_STORE = { "Cache-Control": "no-store" } as const;

// Token absent ou refusé par Vercel : dans les deux cas, l'URL manuelle est la sortie.
const STORAGE_UNAVAILABLE =
  "Stockage d'images non configuré (BLOB_READ_WRITE_TOKEN). Collez une URL http(s) à la place.";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/**
 * Quota utilisateur : somme des blobs sous `u/<userId>/`, paginée tant que
 * `hasMore`. La taille entrante est comptée d'emblée (projection du put).
 */
async function exceedsQuota(prefix: string, incomingSize: number): Promise<boolean> {
  let bytes = incomingSize;
  let files = 1;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
    for (const blob of page.blobs) {
      bytes += blob.size;
      files += 1;
      if (bytes > BLOB_QUOTA_BYTES || files > BLOB_QUOTA_FILES) return true;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return false;
}

/**
 * Upload d'image authentifié vers Vercel Blob. Le nom serveur est reconstruit
 * de zéro (userId/purpose/UUID/extension) : le nom d'origine ne touche jamais
 * le chemin, donc aucun path traversal possible.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return json({ error: "Connexion requise." }, 401);

  // shortcut: formData bufferise tout le multipart ; ce pré-contrôle Content-Length
  // borne les envois volumineux (un parsing multipart en flux serait nécessaire sinon).
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES + 10_000) {
    return json({ error: UPLOAD_MESSAGES.tooLarge }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }

  const file = form.get("file");
  const purpose = form.get("purpose");
  if (!(file instanceof File)) return json({ error: "Fichier manquant." }, 400);
  if (typeof purpose !== "string") {
    return json({ error: UPLOAD_MESSAGES.badPurpose }, 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ error: UPLOAD_MESSAGES.tooLarge }, 413);
  }

  // Seuls les 16 premiers octets sont lus : les magic bytes suffisent, le
  // reste du fichier est passé tel quel à Blob.
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const check = validateUpload({ purpose, declaredType: file.type, size: file.size, bytes });
  if (!check.ok) return json({ error: check.error }, 400);

  if (!process.env.BLOB_READ_WRITE_TOKEN) return json({ error: STORAGE_UNAVAILABLE }, 503);

  const prefix = `u/${session.user.id}/`;
  try {
    if (await exceedsQuota(prefix, file.size)) {
      return json({ error: "Quota de stockage d'images dépassé (200 Mo ou 500 fichiers)." }, 413);
    }
  } catch (error) {
    // Token invalide ou service injoignable : même sortie que « non configuré ».
    console.error("Échec de l'accès Blob :", error);
    return json({ error: STORAGE_UNAVAILABLE }, 503);
  }

  const pathname = `u/${session.user.id}/${purpose}/${crypto.randomUUID()}.${check.ext}`;
  try {
    const blob = await put(pathname, file, {
      access: "public",
      contentType: check.mime,
      addRandomSuffix: false,
    });
    return json({ url: blob.url });
  } catch (error) {
    console.error("Échec de l'upload Blob :", error);
    return json({ error: "Envoi de l'image impossible." }, 502);
  }
}
