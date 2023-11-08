import { prisma } from "./client";
import { Artist, Prisma, Album } from "@prisma/client";

type Tx = typeof prisma.$transaction extends (lm: (tx: infer Tx) => any) => any
  ? Tx
  : never;

type FullArtist = Artist & {
  albums?: Omit<Album, "artistUrl">[];
  relatedArtists?: Artist[];
};

export const upsert = (
  { albums, relatedArtists, ...artist }: FullArtist,
  con: Tx = prisma,
) => {
  const statement: Prisma.ArtistCreateInput = {
    ...artist,
    albums: {
      connectOrCreate: albums?.map((album) => ({
        where: { artistUrl_name: { name: album.name, artistUrl: artist.url } },
        create: album,
      })),
    },
    toRelatedArtists: {
      connectOrCreate: relatedArtists?.map((related) => ({
        where: { url: related.url },
        create: related,
      })),
    },
  };

  return con.artist.upsert({
    where: { url: artist.url },
    update: statement,
    create: statement,
  });
};

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
