import { Prisma, prisma, artistDB } from "@scruffy/database";
import { getArtistFrompage, getArtistsFromRockPage } from "@scruffy/scraper";
import * as http from "http";

const agent = new http.Agent({
  maxTotalSockets: 10,
});

type MakeKeyNotNull<O extends object, Key extends keyof O> = {
  [k in keyof O]: k extends Key ? Exclude<O[k], undefined | null> : O[k];
};

(async () => {
  const rockArtists = await getArtistsFromRockPage();
  let settled = 0;
  const promises = Object.entries(rockArtists)
    .slice(0, 1000)
    .map(([url, name]) =>
      getArtistFrompage(url, { httpAgent: agent })
        .catch((e) => {
          console.error(`Could not get artist ${name} from ${url}`, e);
          return null;
        })
        .then((a) => {
          settled++;
          console.debug(`settled ${settled} artists`);
          return a;
        }),
    );
  console.log(`Got ${promises.length} bands`);
  const artists = await Promise.all(promises);

  for (const artist of artists) {
    if (!artist) continue;
    await artistDB.upsert({
      ...artist,
      imageUrl: null,
      relatedArtists: [],
      albums: artist.albums
        .filter(
          (album): album is MakeKeyNotNull<typeof album, "rating"> =>
            album.rating !== undefined,
        )
        .map((album) => ({
          ...album,
          imageUrl: null,
          year: album.year ?? null,
          rating: new Prisma.Decimal(album.rating),
        })),
    });
  }
})();
