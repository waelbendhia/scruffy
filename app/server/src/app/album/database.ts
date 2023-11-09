import { prisma } from "@scruffy/database";
import type { Album, Artist, Prisma } from "@scruffy/database";
import { z } from "zod";
import { ItemsPerPage, Page } from "../validation";

const SortBy = z.enum(["rating", "year", "name", "artist"]);
type SortBy = z.TypeOf<typeof SortBy>;

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

const getPhotoUrl = (_: string, _1: string) =>
  // TODO: this logic should not live here
  Promise.resolve<string | undefined>(undefined);

export const updateEmptyPhotos = async () =>
  prisma.$transaction(async (tx) => {
    const albums = await tx.album.findMany({
      where: { imageUrl: null },
      select: { artist: { select: { url: true, name: true } }, name: true },
    });

    const albumCovers = await Promise.all(
      albums.map((album) =>
        getPhotoUrl(album.name, album.artist.name).then((imageUrl) => ({
          ...album,
          imageUrl,
        })),
      ),
    );

    for (const album of albumCovers) {
      await prisma.album.update({
        where: {
          artistUrl_name: { artistUrl: album.artist.url, name: album.name },
        },
        data: {
          imageUrl: album.imageUrl,
        },
      });
    }
  });

export const find = (artist: Artist) =>
  prisma.album.findMany({
    where: { artist: { url: artist.url } },
  });

const Rating = z.string().pipe(z.coerce.number().min(0).max(10));

export const SearchRequest = z.object({
  ratingMin: Rating.optional(),
  ratingMax: Rating.optional(),
  yearMin: z.string().pipe(z.coerce.number()).optional(),
  yearMax: z.string().pipe(z.coerce.number()).optional(),
  includeUnknown: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  name: z.string().optional(),
  sortBy: SortBy.optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),

  itemsPerPage: ItemsPerPage.optional(),
  page: Page.optional(),
});

export type SearchRequest = z.TypeOf<typeof SearchRequest>;

export const search = ({
  itemsPerPage = 10,
  page = 0,
  sortOrder = "desc",
  sortBy = "year",
  name,
  yearMin,
  yearMax,
  includeUnknown,
  ratingMin,
  ratingMax,
}: SearchRequest) =>
  prisma.$transaction(async (tx) => {
    const nameFilter: Prisma.StringFilter | undefined =
      name !== undefined ? { contains: name } : undefined;
    const whereQuery: Prisma.AlbumWhereInput = {
      AND: [
        { year: { gte: yearMin, lte: yearMax } },
        { year: includeUnknown === false ? { not: null } : undefined },
      ],
      rating: { gte: ratingMin, lte: ratingMax },
      name: nameFilter,
      artist: { name: nameFilter },
    };

    const orderBy: Prisma.AlbumOrderByWithRelationInput =
      sortBy === "artist"
        ? { artist: { name: sortOrder } }
        : { [sortBy]: sortOrder };

    const data = await tx.album.findMany({
      where: whereQuery,
      include: { artist: { select: { name: true, url: true } } },
      orderBy,
      take: itemsPerPage,
      skip: itemsPerPage * page,
    });
    const total = await tx.album.count({ where: whereQuery });

    return { data, total };
  });

export const getCount = () => prisma.album.count({});
