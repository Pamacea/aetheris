import { prisma } from "@/lib/prisma";
import type { NovelRole } from "./logic";

/** Rôle de l'utilisateur sur un roman ; null si anonyme ou sans droit. */
export async function getNovelRole(
  novelId: string,
  userId: string | null | undefined,
): Promise<NovelRole | null> {
  if (!userId) return null;
  const novel = await prisma.novel.findFirst({
    where: {
      id: novelId,
      OR: [{ authorId: userId }, { collaborators: { some: { userId, role: "editor" } } }],
    },
    select: { authorId: true },
  });
  if (!novel) return null;
  return novel.authorId === userId ? "author" : "editor";
}
