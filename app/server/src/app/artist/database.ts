import { Artist, Prisma, Album, prisma } from "@scruffy/database";

type Tx = typeof prisma.$transaction extends (lm: (tx: infer Tx) => any) => any
  ? Tx
  : never;

type FullArtist = Artist & { albums?: Album[]; relatedArtists?: Artist[] };

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

export type SearchRequest = {
  name: string;
  numberOfResults: number;
  page: number;
};

export const search = async ({
  name,
  numberOfResults,
  page,
}: SearchRequest) =>
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
