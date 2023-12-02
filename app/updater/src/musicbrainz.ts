import { AxiosHeaders, AxiosInstance } from "axios";

type ReleaseWithoutFront = {
  id: string;
  score: number;
  count: number;
  title: string;
  "status-id": string;
  status: string; // TODO: maybe an enum
  packaging: string;
  "text-representation": { language: string; script: string };
  "artist-credit": {
    artist: {
      id: string;
      name: string;
      "sort-name": string;
      aliases: {
        "sort-name": string;
        name: string;
        locale: string | null;
        type: string;
        primary: string | null;
        "begin-date": string | null;
        "end-date": string | null;
      }[];
    };
  }[];
  "release-group": {
    id: string;
    "primary-type": string;
  };
  date: string;
  country: string;
  "release-events": {
    date: string;
    area: {
      id: string;
      name: string;
      "sort-name": string;
      "iso-3166-1-codes": string[];
    };
  }[];
  barcode: string;
  "label-info": {
    "catalog-number": string;
    label: { id: string; name: string };
  }[];
  "track-count": number;
  media: {
    format: string;
    "disc-count": string;
    "track-count": string;
  }[];
};

type MusicBrainzReleaseSearchResultWithoutFront = {
  created: string;
  count: number;
  offset: number;
  releases: ReleaseWithoutFront[];
};

export type MusicBrainzReleaseSearchResult = Awaited<
  ReturnType<typeof searchMusicBrainzAlbums>
>;

export type MusicBrainzRelease =
  MusicBrainzReleaseSearchResult["releases"][number];

export const searchMusicBrainzAlbums = async (
  client: AxiosInstance,
  coverArtClient: AxiosInstance,
  artist: string,
  album: string,
) => {
  const { data } = await client.get<MusicBrainzReleaseSearchResultWithoutFront>(
    "/release",
    {
      params: { query: `release:${album} AND artist:${artist}` },
    },
  );

  const releases = await Promise.all(
    data.releases.map(async (rel) => {
      if (rel.score < 80) return { ...rel, front: undefined };

      for (const url of [
        `/release/${rel.id}/front-500`,
        `/release/${rel.id}/front-250`,
        `/release/${rel.id}/front`,
      ]) {
        const resp = await coverArtClient.get(url);
        if (resp.status !== 307 || !(resp.headers instanceof AxiosHeaders)) {
          continue;
        }

        const imageURL = resp.headers.get("Location");
        if (typeof imageURL !== "string") {
          continue;
        }

        return { ...rel, front: imageURL };
      }

      return { ...rel, front: undefined };
    }),
  );

  return { ...data, releases };
};
