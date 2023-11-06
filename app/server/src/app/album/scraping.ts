import { IAlbum } from './types';
import request from 'request-promise-native';
import cheerio from 'cheerio';
import http from 'http';

const headers = { 'User-Agent': 'request' };
const lastfm_api_key = process.env.LASTFM_API_KEY;
const withDefault = <T>(res: RegExpMatchArray | null, def: T) =>
  !!res && res.length > 0 ? res[0] : def;

const findInBody = ($: CheerioStatic): IAlbum[] => {
  if ($('table').get().length === 0) {
    return [];
  }

  const albumPattern = /.+, ([0-9]*.[0-9]+|[0-9]+)\/10/g;
  const ablumsText = $('table:nth-of-type(1) td:nth-of-type(1)').text();
  const albumStrings = ablumsText.match(albumPattern);

  if (!albumStrings) { return []; }

  const albumNamePattern = /(^.+)(?=[(].*[)])|(^.+)(?=,)/;
  const yearPattern = /[0-9]{4}(?=\))/;
  const ratingPattern = /(([0-9].[0-9])|[0-9])(?=\/10)/;

  return albumStrings
    .map(
      str => ({
        name: withDefault(str.match(albumNamePattern), '').trim(),
        year: parseInt(withDefault(str.match(yearPattern), '0'), 10),
        rating: parseFloat(withDefault(str.match(ratingPattern), '0')),
        imageUrl: '',
      })
    );
};

const getBestAllTimeDates =
  async (timeout: number, pool: http.Agent): Promise<IAlbum[]> => {
    const $ = await request({
      uri: 'http://scaruffi.com/music/picbest.html',
      timeout,
      headers,
      pool,
      transform: (body) => cheerio.load(body),
    }) as CheerioStatic;

    const yearPattern = /[0-9]{4}(?=\.)/;
    const albumNamePattern = /: .*/;
    const linerElements =
      $('center:nth-of-type(1) table:nth-of-type(1) tr').get();

    return linerElements.map(
      linerElement => {
        const bandAndAlbumName =
          $(linerElement)
            .children('td').eq(0)
            .children('font').eq(0)
            .children('b').eq(0);
        const linerNotes = $(linerElement).children('td').eq(1).text();

        return {
          year: parseInt(withDefault(linerNotes.match(yearPattern), '0'), 10),
          rating: 0,
          imageUrl: '',
          name: withDefault(
            (bandAndAlbumName.text() || '')
              .replace(/[\r\n]+/g, ' ').match(albumNamePattern),
            ''
          ).substring(2),
          band: {
            name: bandAndAlbumName.children('a').eq(0).text(),
            url: bandAndAlbumName.children('a').attr('href').substring(3),
          },
        };
      }
    );
  };

const scrape = ($: CheerioStatic, elements: string[]): IAlbum[] => {
  const yearRX = /[0-9]{4}(?=[)])/;
  const bandRX = /.*(?=:)/;
  const albmRX = /: .*(?=[(])/;

  return elements
    .map(elem => $(elem).children('li').get())
    .map(
      albumElements =>
        albumElements.map(
          albumElement => {
            const bandAlbumName =
              ($(albumElement).text() || '').replace(/[\r\n]+/g, ' ');

            return {
              name:
                withDefault(bandAlbumName.match(albmRX), '')
                  .substring(2),
              year:
                parseInt(withDefault(bandAlbumName.match(yearRX), '0'), 10),
              rating: 0,
              imageUrl: '',
              band: {
                name: withDefault(bandAlbumName.match(bandRX), ''),
                url:
                  ($(albumElement).children('a').get().length > 0
                    ? $(albumElement)
                      .children('a').eq(0)
                      .attr('href').substring(3)
                    : ''
                  )
                    .split('#')[0],
              },
            };
          }
        ).filter(({ name }) => !!name)
    )
    .reduce((p, c) => [...p, ...c], []);
};

const getBestOfDecadeDates =
  async (
    decade: number,
    timeout: number,
    pool: http.Agent
  ) => {
    const $ = await request({
      uri: `http://scaruffi.com/ratings/${decade < 10 ? '00' : decade}.html`,
      timeout,
      pool,
      headers: headers,
      transform: body => cheerio.load(body),
    }) as CheerioStatic;

    return !$('center').get(0)
      ? []
      : scrape(
        $,
        $('center').eq(0)
          .children('table').eq((decade === 0 || decade === 10) ? 3 : 2)
          .children('tbody').eq(0)
          .children('tr').eq(0)
          .children('td').eq(0)
          .children('ul').get()
      );
  };

const getAllDatesFromScaruffiTopLists =
  async (timeout: number, pool: http.Agent) =>
    [
      ... await getBestAllTimeDates(timeout, pool),
      ... await getBestOfDecadeDates(60, timeout, pool),
      ... await getBestOfDecadeDates(70, timeout, pool),
      ... await getBestOfDecadeDates(80, timeout, pool),
      ... await getBestOfDecadeDates(90, timeout, pool),
      ... await getBestOfDecadeDates(0, timeout, pool),
      ... await getBestOfDecadeDates(10, timeout, pool),
    ];

const getPhotoUrl =
  async (
    album: IAlbum,
    timeout: number,
    pool: http.Agent
  ): Promise<string> => {
    const json = await request({
      url:
        'http://ws.audioscrobbler.com/2.0/?method=album.getinfo'
        + '&artist=' + (album.band || { name: '' }).name
        + '&album=' + album.name
        + '&api_key=' + lastfm_api_key
        + '&format=json',
      timeout,
      pool,
      json: true,
    });

    return !!json.album
      ? json
        .album
        .image[Math.min(3, json.album.image.length - 1)]['#text'] as string
      : '';
  };

export {
  findInBody,
  getPhotoUrl,
  getAllDatesFromScaruffiTopLists
};
