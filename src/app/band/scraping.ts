export {
  getPhotoUrl,
  getInfo,
  getAllBands,
};

import request from 'request-promise-native';
import { Band } from './types';
import { Album, findInBody } from '../album';

const
  headers = { 'User-Agent': 'request' },
  lastfm_api_key = process.env.LASTFM_API_KEY,
  withDefault =
    <T>(res: RegExpMatchArray | null, def: T) =>
      !!res
        && res.length > 0
        ? res[0] : def;

const getFromBandsPage =
  async (
    uri: string,
    selectionFunction: (_: CheerioStatic) => string[]
  ) => {
    const
      $ = await request({
        uri, headers, transform: (body) => cheerio.load(body)
      }) as CheerioStatic,
      bandElements = selectionFunction($);

    return bandElements.reduce(
      (p, elem) => {
        let bandUrl = $(elem).attr('href').substring(3);
        if (bandUrl.indexOf('#') !== -1) {
          bandUrl = bandUrl.substring(0, bandUrl.indexOf('#'));
        }
        return {
          ...p,
          [bandUrl]: { name: $(elem).text().trim() }
        };
      },
      {}
    ) as { [url: string]: { name: string } };
  };


const getRock = () =>
  getFromBandsPage(
    'http://scaruffi.com/music/groups.html',
    $ => $('table:nth-of-type(3) a').get()
  );


const getJazz = () =>
  getFromBandsPage(
    'http://scaruffi.com/jazz/musician.html',
    $ => $('[width="400"] a').get()
  );


const getFromVolume = (volume: number) =>
  getFromBandsPage(
    'http://scaruffi.com/vol' + volume,
    $ => {
      let elems: string[] = [];
      $('select')
        .each(
          (i, elem) =>
            elems = [...elems, ...$(elem).children('option').slice(1).get()]
        );
      elems.forEach(entry => {
        let url = $(entry).attr('value');
        url =
          url.substring(3, 6) === 'vol' ||
            url.substring(3, 8) === 'avant' ||
            url.substring(3, 7) === 'jazz'
            ? url : `../vol${volume}/${url}`;
        if (url.indexOf('#') !== -1) {
          url = url.substring(0, url.indexOf('#'));
        }
        $(entry).attr('href', url);
      });
      return elems;
    });

const getAllBands = async () => {
  const bands = {
    ...await getJazz(),
    ...await getRock(),
    ...await getFromVolume(1),
    ...await getFromVolume(2),
    ...await getFromVolume(3),
    ...await getFromVolume(4),
    ...await getFromVolume(5),
    ...await getFromVolume(6),
    ...await getFromVolume(7),
    ...await getFromVolume(8),
    ...await getFromVolume(9)
  };
  return Object.keys(bands)
    .map(url => ({ url, name: bands[url].name }));
};


const getNameFromBody = ($: CheerioStatic) => {
  if ($('center').get().length === 0) {
    return '';
  }

  let name = '',
    parentNode = $('center').get(0);

  while ($(parentNode).children().length > 0) {
    for (let i = 0; i < $(parentNode).children().length; i++) {
      name = $($(parentNode).children().get(i)).text().trim();
      if (!!name) {
        parentNode = $(parentNode).children().get(i);
        break;
      }
    }
  }

  return name;
};

const getBioFromBody = ($: CheerioStatic) => {
  let bio = '';
  if ($('table').get().length > 1) {
    const tables = $('table:nth-of-type(2) [bgcolor]').get();
    for (let k = 0; k < tables.length; k += 2) {
      const table = tables[k];
      for (let j = 0; j < $(table).contents().get().length; j++) {
        const childNode = $(table).contents().get(j);
        bio += childNode.name === 'br' ?
          '\n' :
          (childNode.name === 'p' ? '\n\n\n' : ' ')
          + $(childNode).text().trim().replace(/\n/g, ' ');
      }
    }
  }
  return bio.trim();
};

const getRelatedBandsFromBody = ($: CheerioStatic, band: Band) => {
  const relatedBands: Band[] = [],
    extractRelatedBandFromElement = (relatedBandElement: CheerioElement) => {
      const relatedBand = {
        name: $(relatedBandElement).text(),
        url: $(relatedBandElement).attr('href').replace('../', '')
      };

      if (!relatedBand.name || !relatedBand.url) { return null; }

      relatedBand.url =
        relatedBand.url.substring(0, relatedBand.url.indexOf('#'));
      relatedBand.url =
        (
          /vol|avant|jazz/.test(relatedBand.url)
            ? ''
            : `vol${parseInt(band.url.charAt(3), 10)}/`
        ) + relatedBand.url;

      const nameIsValid = !(/contact|contattami/.test(relatedBand.name)),
        urlIsValid =
          !(/mail|http|history|oldavant|index/.test(relatedBand.url))
          && (relatedBand.url.match(/\//g) || []).length === 1
          && relatedBand.url !== band.url;
      return urlIsValid && nameIsValid ? relatedBand : null;
    };

  if ($('table').get().length <= 1) { return relatedBands; }
  return $('table:nth-of-type(2) [bgcolor]').get().map(
    elem =>
      [...Array($(elem).children('a').length).keys()]
        .map(i => extractRelatedBandFromElement($(elem).children('a').get(i)))
  )
    .reduce((p, c) => [...p, ...c], [])
    .filter(b => !!b) as Band[];
};

const getInfo = async (band: Band): Promise<Band> => {
  const $ = await request({
    uri: `http://scaruffi.com/${band.url}`,
    timeout: 30000,
    headers,
    transform: (body) => cheerio.load(body)
  }) as CheerioStatic;
  return {
    name: getNameFromBody($),
    bio: getBioFromBody($),
    albums: findInBody($),
    relatedBands: getRelatedBandsFromBody($, band),
    url: band.url,
  };
};

const getPhotoUrl = async (band: Band) => {
  const json = await request({
    url:
      'http://ws.audioscrobbler.com/2.0/?method=artist.getinfo'
      + '&artist=' + band.name
      + '&api_key=' + lastfm_api_key
      + '&format=json',
    json: true
  });
  return !!json.artist
    ? json
      .artist
      .image[Math.min(3, json.artist.image.length - 1)]['#text'] as string
    : '';
};
