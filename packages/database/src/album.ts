import { prisma } from "./client";
import { Artist, Prisma, Album } from "@prisma/client";

type SortBy = "rating" | "year" | "name" | "artist";

export const insert = (artist: Artist, album: Album) => {
  const insertData: Prisma.AlbumCreateInput = {
    ...album,
    artist: { connect: { url: artist.url } },
  };

  return prisma.album.upsert({
    where: { artistUrl_name: { name: album.name, artistUrl: artist.url } },
    update: insertData,
    create: insertData,
  });
};

export const find = (artist: Artist) =>
  prisma.album.findMany({
    where: { artist: { url: artist.url } },
  });

export type SearchRequest = {
  ratingLower?: number;
  ratingHigher?: number;
  yearLower?: number;
  yearHigher?: number;
  includeUnknown?: boolean;
  name?: string;
  sortBy?: SortBy;
  sortOrder?: "asc" | "desc";
  page: number;
  numberOfResults: number;
};

export const search = (req: SearchRequest) =>
  prisma.$transaction(async (tx) => {
    const nameFilter: Prisma.StringFilter | undefined =
      req.name !== undefined ? { contains: req.name } : undefined;
    const whereQuery: Prisma.AlbumWhereInput = {
      OR: [
        {
          year: {
            gte: req.yearLower,
            lte: req.yearLower,
          },
        },
        {
          year: req.includeUnknown === false ? { not: null } : undefined,
        },
      ],
      rating: { gte: req.ratingLower, lte: req.ratingHigher },
      name: nameFilter,
      artist: { name: nameFilter },
    };

    const sortOrder = req.sortOrder ?? "desc";
    const orderBy: Prisma.AlbumOrderByWithRelationInput =
      req.sortBy === undefined
        ? { year: sortOrder }
        : req.sortBy === "artist"
        ? { artist: { name: sortOrder } }
        : { [req.sortBy]: sortOrder };

    const data = await tx.album.findMany({
      where: whereQuery,
      include: { artist: true },
      orderBy,
      take: req.numberOfResults,
      skip: req.numberOfResults * req.page,
    });
    const count = await tx.album.count({ where: whereQuery });

    return { data, count };
  });

export const getCount = () => prisma.album.count({});
