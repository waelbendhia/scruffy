import { AxiosInstance } from "axios";
import { URL } from "url";

type LastFMImage = {
  "#text": string;
  size: "small" | "medium" | "large" | "extralarge" | "mega" | "";
};
const lastFMDefaultImage = "2a96cbd8b46e442fc41c2b86b821562f.png";

export const getBiggestLastFMImage = (imgs?: LastFMImage[]) =>
  imgs?.reduce(
    (prev, cur) => {
      const imageURL = cur["#text"];
      if (!imageURL || new URL(imageURL).pathname.split("/")) {
        return prev;
      }

      const path = new URL(imageURL).pathname.split("/");
      if (path[path.length - 1] === lastFMDefaultImage) {
        return prev;
      }

      switch (prev?.size) {
        case "small":
          switch (cur.size) {
            case "medium":
            case "large":
            case "extralarge":
            case "mega":
              return cur;
            default:
              return prev;
          }
        case "medium":
          switch (cur.size) {
            case "large":
            case "extralarge":
            case "mega":
              return cur;
            default:
              return prev;
          }
        case "large":
          switch (cur.size) {
            case "extralarge":
            case "mega":
              return cur;
            default:
              return prev;
          }
        case "extralarge":
          switch (cur.size) {
            case "mega":
              return cur;
            default:
              return prev;
          }
        case "mega":
          return prev;
        default:
          return cur;
      }
    },
    undefined as LastFMImage | undefined,
  );

export type LastFMArtist = {
  artist: {
    name: string;
    url: string;
    image: LastFMImage[];
    tags: {
      tag: { name: string; url: string }[];
    };
  };
};

type Error = {
  error: number;
  message: string;
};

export const getLastFMArtist = async (client: AxiosInstance, name: string) => {
  try {
    const resp = await client.get<LastFMArtist | Error>("", {
      params: {
        method: "artist.getinfo",
        artist: name,
      },
    });

    if ("error" in resp.data) {
      console.error("whoopsie in last.fm", resp.data);
      return null;
    }

    return resp.data;
  } catch (e) {
    console.error("whoopsie in last.fm", e);
    return null;
  }
};

type LastFMTrack = {
  streamable: { fulltrack: string; "#text": string };
  duration: number;
  url: string;
  name: string;
  "@attr": { rank: 1 };
  artist: {
    url: string;
    name: string;
    mbid: string;
  };
};

export type LastFMAlbum = {
  album: {
    artist: string;
    mbid: string;
    tags: {
      tag: { name: string; url: string }[];
    };
    image: LastFMImage[];
    tracks: { track: LastFMTrack[] };
    url: string;
    name: string;
    listeners: string;
    wiki: {
      published: string;
      summary: string;
      content: string;
    };
  };
};

export const getLastFMAlbum = async (
  client: AxiosInstance,
  artist: string,
  name: string,
) => {
  try {
    const resp = await client.get<LastFMAlbum | Error>("", {
      params: {
        method: "album.getinfo",
        artist: artist,
        album: name,
      },
    });

    if ("error" in resp.data) {
      console.error("whoopsie in last.fm", resp.data);
      return null;
    }

    return resp.data;
  } catch (e) {
    console.error("whoopsie in last.fm", e);
    return null;
  }
};
