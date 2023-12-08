import { prisma } from "@scruffy/database";
import { z } from "zod";
import { ItemsPerPage, Page } from "../validation";

export const getName = (artistUrl: string) =>
  prisma.artist.findUnique({
    where: { url: artistUrl },
    select: { name: true },
  });

export const get = (artistUrl: string) =>
  prisma.artist.findUnique({
    where: { url: artistUrl },
    select: {
      url: true,
      imageUrl: true,
      bio: true,
      name: true,
      toRelatedArtists: { select: { url: true, name: true } },
      fromRelatedArtists: { select: { url: true, name: true } },
      albums: { include: {}, orderBy: { year: "asc" } },
      fromUpdate: true,
    },
  });

export const getCount = () => prisma.artist.count();

export const SearchRequest = z.object({
  name: z.string().optional(),
  itemsPerPage: ItemsPerPage.optional(),
  page: Page.optional(),
  sort: z.enum(["name", "lastModified"]).default("name"),
});

export type SearchRequest = z.TypeOf<typeof SearchRequest>;

export const search = async ({
  name,
  itemsPerPage = 10,
  page = 0,
  sort,
}: SearchRequest) =>
  prisma.$transaction(async (tx) => {
    for (let i = 0; i < 1000; i++) {
      const res = await tx.artist.findMany({
        select: { url: true, bio: true, imageUrl: true, lastModified: true },
        take: 1,
        skip: i,
      });
      console.log(res[0]?.url);
    }

    const data = await tx.$queryRaw<
      { name: string; url: string; imageUrl?: string; lastModified: Date }[]
    >`SELECT name, url, imageUrl, lastModified
      FROM Artist
      WHERE ${name} ISNULL OR name LIKE "%" || ${name ?? ""} || "%"
      ORDER BY
        (CASE WHEN name = ${name} THEN 1 WHEN name LIKE ${name} || "%" THEN 2 ELSE 3 END),
        (CASE WHEN ${sort} = 'lastModified' THEN -lastModified ELSE name COLLATE NOCASE END) ASC
      LIMIT ${itemsPerPage} OFFSET ${itemsPerPage * page}`;

    const total = await tx.artist.count({
      where: { name: { contains: name } },
    });
    return { data, total };
  });
