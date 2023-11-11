import { Artist, Prisma, Album, prisma } from "@scruffy/database";
import { z } from "zod";
import { ItemsPerPage, Page } from "../validation";

type Tx = typeof prisma.$transaction extends (lm: (tx: infer Tx) => any) => any
  ? Tx
  : never;

type FullArtist = Artist & {
  albums?: Album[];
  relatedArtists?: { url: string }[];
};

export const upsert = (
  { albums, relatedArtists, ...artist }: FullArtist,
  con: Tx = prisma,
) => {
  const createInput: Prisma.ArtistCreateInput = {
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
        create: {
          ...related,
          name: "",
          firstRetrieved: artist.firstRetrieved,
          lastRetrieved: artist.lastRetrieved,
          lastUpdated: artist.lastUpdated,
        },
      })),
    },
  };

  const updateInput: Prisma.ArtistUpdateInput = {
    ...createInput,
    firstRetrieved: undefined,
  };

  return con.artist.upsert({
    where: { url: artist.url },
    update: updateInput,
    create: createInput,
  });
};

export const updateEmptyPhotos = async () =>
  prisma.$transaction(async (tx) => {
    const artists = await tx.artist.findMany({
      where: { imageUrl: null },
      select: { url: true, name: true },
    });
    const artistsWithImageUrls = await Promise.all(
      artists.map(async ({ url, name }) => {
        try {
          const imageUrl = undefined; // TODO: get artist photo from somewhere
          return { url, imageUrl };
        } catch (e) {
          console.error(`Failed photo for ${name}`, e);
          return null;
        }
      }),
    );
    for (const artist of artistsWithImageUrls) {
      if (!!artist) {
        await prisma.artist.update({
          where: { url: artist.url },
          data: { imageUrl: artist.imageUrl },
        });
      }
    }
  });

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

export const SearchRequest = z.object({
  name: z.string().optional(),
  itemsPerPage: ItemsPerPage.optional(),
  page: Page.optional(),
});

export type SearchRequest = z.TypeOf<typeof SearchRequest>;

export const search = async ({
  name,
  itemsPerPage = 10,
  page = 0,
}: SearchRequest) =>
  prisma.$transaction(async (tx) => {
    const data = await tx.artist.findMany({
      where: { name: { contains: name } },
      select: {
        name: true,
        url: true,
        imageUrl: true,
        lastUpdated: true,
        firstRetrieved: true,
        lastRetrieved: true,
      },
      orderBy: { name: "asc" },
      take: itemsPerPage,
      skip: itemsPerPage * page,
    });
    const total = await tx.artist.count({
      where: { name: { contains: name } },
    });
    return { data, total };
  });
