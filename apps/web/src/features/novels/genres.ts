import { prisma } from "@/lib/prisma";
import { mergeGenres } from "./logic";

/** Genres proposés partout : liste connue + genres déjà présents en base. */
export async function listNovelGenres(): Promise<string[]> {
  const rows = await prisma.novel.findMany({ select: { genre: true }, distinct: ["genre"] });
  return mergeGenres(rows.map((row) => row.genre));
}
