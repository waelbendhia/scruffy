import request from 'request-promise-native';
import http from 'http';
import { IBand } from '../band';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

interface ILFMImage {
  '#text': string;
  size: LFMSizes;
}

interface ILFMBio {
  links: {
    link: {
      '#text': string;
      rel: string;
      href: string
    }
  };
  published: string;
  summary: string;
}

interface ILFMArtistPartial {
  name: string;
  url: string;
  image: ILFMImage[];
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
    artist: ILFMArtistPartial[]
  };
  tags: {
    tag: {
      name: string;
      url: string;
    }[]
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
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extralarge',
  MEGA = 'mega',
}

const sizeToNum = (a: LFMSizes): number => {
  switch (a) {
    case LFMSizes.SMALL: return 0;
    case LFMSizes.MEDIUM: return 1;
    case LFMSizes.LARGE: return 2;
    case LFMSizes.EXTRA_LARGE: return 3;
    case LFMSizes.MEGA: return 4;
    default: return -1;
  }
};

const compareSizes = (a: LFMSizes, b: LFMSizes) => sizeToNum(a) - sizeToNum(b);

type ILFMBandResponse = ILFMBandSuccess | ILFMBandError;

const getLastFMBandData = async (
  band: IBand,
  timeout: number,
  pool: http.Agent
) => await request({
  url:
    'http://ws.audioscrobbler.com/2.0/?method=artist.getinfo'
    + '&artist=' + band.name
    + '&api_key=' + LASTFM_API_KEY
    + '&format=json',
  timeout,
  pool,
  json: true,
}) as ILFMBandResponse;

interface ILFMTagsResponse {
  topartists: {
    artist: ILFMArtist[];
  };
}


const getByTag = async (
  tag: string,
  limit: number,
  timeout: number,
  pool: http.Agent
) => await request({
  url:
    'http://ws.audioscrobbler.com/2.0/?method=tag.gettopartists'
    + '&tag=' + tag
    + '&limit=' + limit
    + '&api_key=' + LASTFM_API_KEY
    + '&format=json',
  timeout,
  pool,
  json: true,
}) as ILFMTagsResponse;

const isSuccessful = (res: ILFMBandResponse): res is ILFMBandSuccess =>
  !!(<ILFMBandSuccess>res).artist;

const getBiggestImage = <T extends { size: LFMSizes }>(xs: T[]): T | null =>
  !!xs
    ? xs.sort((a, b) => compareSizes(b.size, a.size))[0]
    : null;

interface ILFMAlbum {
  name: string;
  mbid: string;
  url: string;
  artist: ILFMArtistPartial;
  image: ILFMImage[];
}

interface ILFMTagsAlbumResponse {
  albums: {
    album: ILFMAlbum[];
  };
}

const getAlbumsByTag = async (
  tag: string,
  limit: number,
  timeout: number,
  pool: http.Agent
) => await request({
  url:
    'http://ws.audioscrobbler.com/2.0/?method=tag.gettopalbums'
    + `&tag=${tag}`
    + `&limit${limit}`
    + `&api_key=${LASTFM_API_KEY}`
    + '&format=json',
  timeout,
  pool,
  json: true,
}) as ILFMTagsAlbumResponse;

export {
  ILFMAlbum,
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
