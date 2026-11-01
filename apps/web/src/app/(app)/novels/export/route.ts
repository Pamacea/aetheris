import JSZip from "jszip";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  EXPORT_README,
  archiveFileName,
  novelFileName,
  serializeNovel,
} from "@/features/novels/export";

export const runtime = "nodejs";

/** Garde-fou mémoire : une archive reste raisonnable pour un auteur. */
const MAX_NOVELS = 200;

/**
 * Archive ZIP des romans dont l'utilisateur est l'auteur.
 * Les collaborations et les romans d'autrui sont exclus par le filtre SQL.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Non connecté.", { status: 401 });

  const novels = await prisma.novel.findMany({
    where: { authorId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: MAX_NOVELS,
    include: { chapters: { orderBy: { position: "asc" } } },
  });

  const now = new Date();
  const zip = new JSZip();
  novels.forEach((novel, index) => {
    zip.file(
      novelFileName(novel.title, index),
      JSON.stringify(serializeNovel(novel, now), null, 2),
    );
  });
  zip.file("lisez-moi.txt", EXPORT_README);

  const archive = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archiveFileName(now)}"`,
      "Cache-Control": "no-store",
    },
  });
}
