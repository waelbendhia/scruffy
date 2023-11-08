import axios from "axios";
import http from "http";

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

export type LFMImage = {
  "#text": string;
  size: LFMSizes;
};

interface ILFMBio {
  links: {
    link: {
      "#text": string;
      rel: string;
      href: string;
    };
  };
  published: string;
  summary: string;
}

interface ILFMArtistPartial {
  name: string;
  url: string;
  image: LFMImage[];
}

interface ILFMStats {
  listeners: number;
  playcount: number;
}

interface ILFMArtist extends ILFMArtistPartial {
  mbid: string;
  streamable: number;
  ontour: number;
  stats: ILFMStats;
  similar: {
    artist: ILFMArtistPartial[];
  };
  tags: {
    tag: {
      name: string;
      url: string;
    }[];
  };
  bio: ILFMBio;
}

interface ILFMBandSuccess {
  artist: ILFMArtist;
}

interface ILFMBandError {
  error: number;
  message: string;
  links: any[];
}

enum LFMSizes {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
  EXTRA_LARGE = "extralarge",
  MEGA = "mega",
}

const sizeToNum = (a: LFMSizes): number => {
  switch (a) {
    case LFMSizes.SMALL:
      return 0;
    case LFMSizes.MEDIUM:
      return 1;
    case LFMSizes.LARGE:
      return 2;
    case LFMSizes.EXTRA_LARGE:
      return 3;
    case LFMSizes.MEGA:
      return 4;
    default:
      return -1;
  }
};

const compareSizes = (a: LFMSizes, b: LFMSizes) => sizeToNum(a) - sizeToNum(b);

type ILFMBandResponse = ILFMBandSuccess | ILFMBandError | undefined;

const getLastFMBandData = async (
  artistName: string,
  timeout: number,
  pool: http.Agent,
) => {
  try {
    const { data } = await axios.get<ILFMBandResponse>(
      "http://ws.audioscrobbler.com/2.0/?method=artist.getinfo" +
        "&artist=" +
        artistName +
        "&api_key=" +
        LASTFM_API_KEY +
        "&format=json",
      {
        timeout,
        httpAgent: pool,
      },
    );
    return data;
  } catch (e) {
    console.log(e);
    return undefined;
  }
};

interface ILFMTagsResponse {
  topartists: {
    artist: ILFMArtist[];
  };
}

const getByTag = (
  tag: string,
  limit: number,
  timeout: number,
  pool: http.Agent,
) =>
  axios
    .get<ILFMTagsResponse>(
      "http://ws.audioscrobbler.com/2.0/?method=tag.gettopartists" +
        "&tag=" +
        tag +
        "&limit=" +
        limit +
        "&api_key=" +
        LASTFM_API_KEY +
        "&format=json",
      { timeout, httpAgent: pool },
    )
    .then((resp) => resp.data);

const isSuccessful = (res: ILFMBandResponse): res is ILFMBandSuccess =>
  !!res && !!(<ILFMBandSuccess>res).artist;

const getBiggestImage = <T extends { size: LFMSizes }>(
  xs: T[],
): T | undefined =>
  xs?.sort((a, b) => compareSizes(b.size, a.size))[0] ?? undefined;

export type LFMAlbum = {
  name: string;
  mbid: string;
  url: string;
  artist: ILFMArtistPartial;
  image: LFMImage[];
};

interface ILFMTagsAlbumResponse {
  albums: {
    album: LFMAlbum[];
  };
}

const getAlbumsByTag = async (
  tag: string,
  limit: number,
  timeout: number,
  pool: http.Agent,
) =>
  axios
    .get<ILFMTagsAlbumResponse>(
      "http://ws.audioscrobbler.com/2.0/?method=tag.gettopalbums" +
        `&tag=${tag}` +
        `&limit=${limit}` +
        `&api_key=${LASTFM_API_KEY}` +
        "&format=json",
      { timeout, httpAgent: pool },
    )
    .then((resp) => resp.data);

export {
  ILFMTagsAlbumResponse,
  ILFMArtistPartial,
  ILFMArtist,
  ILFMBandSuccess,
  ILFMBandError,
  ILFMBandResponse,
  isSuccessful,
  getBiggestImage,
  getLastFMBandData,
  getByTag,
  getAlbumsByTag,
};
