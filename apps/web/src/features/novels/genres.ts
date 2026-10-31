import { prisma } from "@/lib/prisma";
import { mergeGenres } from "./logic";

/** Genres proposés partout : liste connue + genres des seuls romans publiés. */
export async function listNovelGenres(): Promise<string[]> {
  const rows = await prisma.novel.findMany({
    where: { status: "published" },
    select: { genre: true },
    distinct: ["genre"],
  });
  return mergeGenres(rows.map((row) => row.genre));
}
