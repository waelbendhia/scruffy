import { prisma } from "./client";

export const get = (artistUrl: string) =>
  prisma.artist.findUnique({
    where: { url: artistUrl },
    select: {
      toRelatedArtists: { include: {} },
      fromRelatedArtists: { include: {} },
      albums: { include: {} },
    },
  });

export const getCount = () => prisma.artist.count();

export type SearchRequest = {
  name: string;
  numberOfResults: number;
  page: number;
};

export const search = async ({ name, numberOfResults, page }: SearchRequest) =>
  prisma.$transaction(async (tx) => {
    const data = await tx.artist.findMany({
      where: {
        name: {
          contains: name,
        },
      },
      orderBy: { name: "asc" },
      take: numberOfResults,
      skip: numberOfResults * page,
    });
    const total = await tx.artist.count({
      where: { name: { contains: name } },
    });
    return { data, total };
  });
