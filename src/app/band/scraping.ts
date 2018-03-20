export {
  getPhotoUrl,
  getInfo,
  getAllBands,
};

import request from 'request-promise-native';
import { Band } from './types';
import { findInBody } from '../album';
import cheerio from 'cheerio';
import http from 'http';

const
  headers = { 'User-Agent': 'request' },
  lastfm_api_key = process.env.LASTFM_API_KEY;

const getFromBandsPage =
  async (
    uri: string,
    timeout: number,
    pool: http.Agent,
    selectionFunction: (_: CheerioStatic) => string[]
  ) => {
    try {
      const
        $ = await request({
          uri,
          headers,
          timeout,
          pool,
          transform: (body) => cheerio.load(body)
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
    } catch (e) {
      console.log(`Failed to get bands from '${uri}'.`);
      // TODO: Handle this
      return {};
    }
  };


const getRock = (timeout: number, pool: http.Agent) =>
  getFromBandsPage(
    'http://scaruffi.com/music/groups.html',
    timeout,
    pool,
    $ => $('table:nth-of-type(3) a').get()
  );


const getJazz = (timeout: number, pool: http.Agent) =>
  getFromBandsPage(
    'http://scaruffi.com/jazz/musician.html',
    timeout,
    pool,
    $ => $('[width="400"] a').get()
  );


const getFromVolume = (volume: number, timeout: number, pool: http.Agent) =>
  getFromBandsPage(
    'http://scaruffi.com/vol' + volume,
    timeout,
    pool,
    $ => {
      let elems: string[] = [];
      $('select')
        .each(
          (_, elem) =>
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

const getAllBands = async (timeout: number, pool: http.Agent) => {
  const bands = {
    ...await getJazz(timeout, pool),
    ...await getRock(timeout, pool),
    ...await getFromVolume(1, timeout, pool),
    ...await getFromVolume(2, timeout, pool),
    ...await getFromVolume(3, timeout, pool),
    ...await getFromVolume(4, timeout, pool),
    ...await getFromVolume(5, timeout, pool),
    ...await getFromVolume(6, timeout, pool),
    ...await getFromVolume(7, timeout, pool),
    ...await getFromVolume(8, timeout, pool),
    ...await getFromVolume(9, timeout, pool),
  };
  return Object.keys(bands)
    .map(url => ({ url, name: bands[url].name }))
    .sort((a, b) => a.name.localeCompare(b.name));
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
          + ($(childNode).text() || '').trim().replace(/\n/g, ' ');
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
        url: ($(relatedBandElement).attr('href') || '').replace('../', '')
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

const getInfo = async (
  band: Band,
  timeout: number,
  pool: http.Agent,
): Promise<Band> => {
  const $ = await request({
    uri: `http://scaruffi.com/${band.url}`,
    timeout,
    pool,
    headers,
    transform: (body) => cheerio.load(body)
  }) as CheerioStatic;
  return {
    name: getNameFromBody($),
    bio: getBioFromBody($).trim(),
    albums: findInBody($),
    relatedBands: getRelatedBandsFromBody($, band),
    url: band.url,
  };
};

const getPhotoUrl = async (band: Band, timeout: number, pool: http.Agent, ) => {
  const json = await request({
    url:
      'http://ws.audioscrobbler.com/2.0/?method=artist.getinfo'
      + '&artist=' + band.name
      + '&api_key=' + lastfm_api_key
      + '&format=json',
    timeout,
    pool,
    json: true
  });
  return !!json.artist
    ? json
      .artist
      .image[Math.min(3, json.artist.image.length - 1)]['#text'] as string
    : '';
};
