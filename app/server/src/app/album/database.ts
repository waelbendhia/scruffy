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
  name: z.string().optional(),
  sort: SortBy.optional().default("year"),

  itemsPerPage: ItemsPerPage.optional(),
  page: Page.optional(),
});

export type SearchRequest = z.TypeOf<typeof SearchRequest>;

type AlbumQueryResult = {
  name: string;
  year?: number;
  rating: bigint;
  imageUrl?: string;
  artistUrl: string;
  artistName: string;
};

export const search = ({
  itemsPerPage = 10,
  page = 0,
  sort = "year",
  name,
  yearMin,
  yearMax,
  ratingMin,
  ratingMax,
}: SearchRequest) =>
  prisma.$transaction(async (tx) => {
    const data = await tx.$queryRaw<AlbumQueryResult[]>`
      SELECT al.name     AS name,
             al.year     AS year,
             al.rating   AS rating,
             al.imageUrl AS imageUrl,
             ar.url      AS artistUrl,
             ar.name     AS artistName
      FROM Album al INNER JOIN Artist ar ON al.artistUrl = ar.url
      WHERE (${name} ISNULL OR al.name LIKE '%' || ${name} || '%'
                            OR ar.name LIKE '%' || ${name} || '%')
        AND (${yearMin} ISNULL OR al.year >= ${yearMin})
        AND (${yearMax} ISNULL OR al.year <= ${yearMax})
        AND (${ratingMin} ISNULL OR al.rating >= ${ratingMin})
        AND (${ratingMax} ISNULL OR al.rating <= ${ratingMax})
        ORDER BY
          (CASE WHEN al.name = ${name} OR ar.name = ${name} THEN 1
                WHEN (al.name LIKE ${name} || '%') OR (ar.name LIKE ${name} || '%') THEN 2
                ELSE 3 END),
          (CASE WHEN ${sort} = 'artist' THEN ar.name COLLATE NOCASE
                WHEN ${sort} = 'name'   THEN al.name COLLATE NOCASE
                WHEN ${sort} = 'year'   THEN -IFNULL(al.year, 0)
                ELSE -rating END) asc
        LIMIT ${itemsPerPage} OFFSET ${itemsPerPage * page}`;
    const [total] = await tx.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM Album al INNER JOIN Artist ar ON al.artistUrl = ar.url
      WHERE (${name} ISNULL OR al.name LIKE '%' || ${name ?? ""} || '%'
                            OR ar.name LIKE '%' || ${name ?? ""} || '%')
        AND (${yearMin} ISNULL OR al.year >= ${yearMin})
        AND (${yearMax} ISNULL OR al.year <= ${yearMax})
        AND (${ratingMin} ISNULL OR al.rating >= ${ratingMin})
        AND (${ratingMax} ISNULL OR al.rating <= ${ratingMax})`;

    return {
      data: data.map(({ artistUrl, artistName, rating, year, ...album }) => ({
        ...album,
        year: year,
        rating: Number(rating),
        artist: { url: artistUrl, name: artistName },
      })),
      total: Number(total.count),
    };
  });

export const getCount = () => prisma.album.count({});
