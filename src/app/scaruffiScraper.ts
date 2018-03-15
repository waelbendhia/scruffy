
export {
	getAllBands,
	getBandInfo,
	getBandPhotoUrl,
	getAlbumPhotoUrl
};

import request from "request-promise-native";
import { load } from "cheerio";
import { Band, Album } from "./types";

const headers = {
	'User-Agent': 'request'
};

const lastfm_api_key = process.env.LASTFM_API_KEY;

/*
 * These functions scrape the jazz, rock and volume pages for bands
 */
const withDefault = <T>(res: RegExpMatchArray | null, def: T) =>
	!!res && res.length > 0 ? res[0] : def;
const getBandsFromBandsPage = async (
	uri: string,
	selectionFunction: (_: CheerioStatic) => string[]
) => {
	const $ = await request({
		uri, headers, transform: (body) => cheerio.load(body)
	}) as CheerioStatic,
		bandElements = selectionFunction($);

	return bandElements.reduce(
		(p, elem) => {
			let bandUrl = $(elem).attr('href').substring(3);
			if (bandUrl.indexOf('#') != -1)
				bandUrl = bandUrl.substring(0, bandUrl.indexOf('#'));
			return {
				...p,
				[bandUrl]: {
					name: $(elem).text().trim()
				}
			}
		},
		{}
	) as { [url: string]: { name: string } }
}

const getRockBands = () =>
	getBandsFromBandsPage(
		"http://scaruffi.com/music/groups.html",
		$ => $('table:nth-of-type(3) a').get()
	);


const getJazzBands = () =>
	getBandsFromBandsPage(
		"http://scaruffi.com/jazz/musician.html",
		$ => $('[width="400"] a').get()
	);


const getBandsFromVolume = (volume: number) =>
	getBandsFromBandsPage(
		"http://scaruffi.com/vol" + volume,
		$ => {
			let elems: string[] = [];
			$('select')
				.each(
					(i, elem) => elems = [...elems, ...$(elem).children('option').slice(1).get()]
				);
			elems.forEach(entry => {
				var url = $(entry).attr('value');
				url =
					url.substring(3, 6) == "vol" ||
						url.substring(3, 8) == "avant" ||
						url.substring(3, 7) == "jazz"
						? url : `../vol${volume}/${url}`;
				if (url.indexOf('#') != -1) {
					url = url.substring(0, url.indexOf('#'));
				}
				$(entry).attr('href', url);
			});
			return elems;
		});


const getAllBands = async () => {
	let allBands = {};
	const bands = {
		...await getJazzBands(),
		...await getRockBands(),
		...await getBandsFromVolume(1),
		...await getBandsFromVolume(2),
		...await getBandsFromVolume(3),
		...await getBandsFromVolume(4),
		...await getBandsFromVolume(5),
		...await getBandsFromVolume(6),
		...await getBandsFromVolume(7),
		...await getBandsFromVolume(8),
		...await getBandsFromVolume(9)
	};
	return Object.keys(bands)
		.map(url => ({ url, name: bands[url].name }));
}

/*
 * These functions scrape individual band pages for album ratings, band relations and bios
 */

const getBandNameFromBody = ($: CheerioStatic) => {
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
}

const getBandBioFromBody = ($: CheerioStatic) => {
	let bio = '';
	if ($('table').get().length > 1) {
		const tables = $('table:nth-of-type(2) [bgcolor]').get();
		for (let k = 0; k < tables.length; k += 2) {
			const table = tables[k];
			for (let j = 0; j < $(table).contents().get().length; j++) {
				const childNode = $(table).contents().get(j);
				bio += childNode.name == 'br' ?
					'\n' :
					(childNode.name == 'p' ? '\n\n\n' : ' ')
					+ $(childNode).text().trim().replace(/\n/g, " ");
			}
		}
	}
	return bio.trim();
}

const getBandAlbumsFromBody = ($: CheerioStatic): Album[] => {
	if ($('table').get().length === 0) {
		return [];
	}

	const albumPattern = /.+, ([0-9]*.[0-9]+|[0-9]+)\/10/g,
		ablumsText = $('table:nth-of-type(1) td:nth-of-type(1)').text(),
		albumStrings = ablumsText.match(albumPattern);

	if (!albumStrings) {
		return [];
	}
	const albumNamePattern = /(^.+)(?=[(].*[)])|(^.+)(?=,)/,
		yearPattern = /[0-9]{4}(?=\))/,
		ratingPattern = /(([0-9].[0-9])|[0-9])(?=\/10)/;

	return albumStrings
		.map(
			str => ({
				name: withDefault(str.match(albumNamePattern), "").trim(),
				year: parseInt(withDefault(str.match(yearPattern), '0')),
				rating: parseInt(withDefault(str.match(ratingPattern), '0')),
				imageUrl: '',
			})
		)
}

const getBandRelatedBandsFromBody = ($: CheerioStatic, band: Band) => {
	const relatedBands: Band[] = [],
		extractRelatedBandFromElement = (relatedBandElement: CheerioElement) => {
			const relatedBand = {
				name: $(relatedBandElement).text(),
				url: $(relatedBandElement).attr("href").replace('../', '')
			};

			if (!relatedBand.name || !relatedBand.url) { return null; }

			relatedBand.url = relatedBand.url.substring(0, relatedBand.url.indexOf('#'));
			relatedBand.url =
				(
					/vol|avant|jazz/.test(relatedBand.url)
						? ''
						: `vol${parseInt(band.url.charAt(3))}/`
				) + relatedBand.url;

			const nameIsValid = !(/contact|contattami/.test(relatedBand.name)),
				urlIsValid =
					!(/mail|http|history|oldavant|index/.test(relatedBand.url))
					&& (relatedBand.url.match(/\//g) || []).length == 1
					&& relatedBand.url != band.url;
			return urlIsValid && nameIsValid ? relatedBand : null;
		}

	if ($("table").get().length <= 1) { return relatedBands; }

	const bioElements = $("table:nth-of-type(2) [bgcolor]").get();

	for (let bioElement in bioElements) {
		for (let n = 0; n < $(bioElement).children('a').get().length; n++) {
			let relatedBand =
				extractRelatedBandFromElement($(bioElement).children('a').get(n));
			if (!!relatedBand) { relatedBands.push(relatedBand); }
		}
	}

	return relatedBands;
}

const getBandInfo = async (band: Band): Promise<Band> => {
	const $ = await request({
		uri: `http://scaruffi.com/${band.url}`,
		timeout: 30000,
		headers,
		transform: (body) => cheerio.load(body)
	}) as CheerioStatic;
	return {
		name: getBandNameFromBody($),
		bio: getBandBioFromBody($),
		albums: getBandAlbumsFromBody($),
		relatedBands: getBandRelatedBandsFromBody($, band),
		url: band.url,
	};
}

/*
 * These functions update album dates from best of all time and best of decades pages
 */

const getBestAlbumsAllTimeDates = async (): Promise<Album[]> => {
	const $ = await request({
		uri: "http://scaruffi.com/music/picbest.html",
		headers,
		transform: (body) => cheerio.load(body)
	}) as CheerioStatic;

	const yearPattern = /[0-9]{4}(?=\.)/,
		albumNamePattern = /: .*/,
		linerElements = $("center:nth-of-type(1) table:nth-of-type(1) tr").get();

	return linerElements.map(
		linerElement => {
			const bandAndAlbumName =
				$(linerElement)
					.children("td").eq(0)
					.children("font").eq(0)
					.children("b").eq(0),
				linerNotes = $(linerElement).children("td").eq(1).text();
			return {
				year: parseInt(withDefault(linerNotes.match(yearPattern), '0')),
				rating: 0,
				imageUrl: '',
				name: withDefault(
					bandAndAlbumName.text().replace(/[\r\n]+/g, " ").match(albumNamePattern),
					""
				).substring(2),
				band: {
					name: bandAndAlbumName.children("a").eq(0).text(),
					url: bandAndAlbumName.children("a").attr("href").substring(3)
				}
			}
		}
	);
}

const scrapeForAlbums = ($: CheerioStatic, elements: string[]): Album[] => {
	const yearPattern = /[0-9]{4}(?=[)])/,
		bandNamePattern = /.*(?=:)/,
		albumNamePattern = /: .*(?=[(])/;
	return elements
		.map(elem => $(elem).children('li').get())
		.map(
			albumElements =>
				albumElements.map(
					albumElement => {
						const bandAlbumName = $(albumElement).text().replace(/[\r\n]+/g, " ");
						return {
							name: withDefault(bandAlbumName.match(albumNamePattern), '').substring(2),
							year: parseInt(withDefault(bandAlbumName.match(yearPattern), '0')),
							rating: 0,
							imageUrl: '',
							band: {
								name: withDefault(bandAlbumName.match(bandNamePattern), ''),
								url:
									(
										$(albumElement).children('a').get().length > 0
											? $(albumElement).children('a').eq(0).attr('href').substring(3)
											: ''
									).split('#')[0]
							}
						};
					}
				).filter(({ name }) => !!name)
		)
		.reduce((p, c) => [...p, ...c], []);
}

const getBestAlbumsOfDecadeDates = async (decade: number) => {
	const $ = await request({
		uri: `http://scaruffi.com/ratings/${decade < 10 ? '00' : decade}.html`,
		headers: headers,
		transform: body => cheerio.load(body),
	});

	return !$("center").get(0)
		? []
		: scrapeForAlbums(
			$,
			$("center").eq(0)
				.children("table").eq((decade == 0 || decade == 10) ? 3 : 2)
				.children("tbody").eq(0)
				.children("tr").eq(0)
				.children("td").eq(0)
				.children("ul").get()
		);
}

const getAllDatesFromScaruffiTopLists = async () =>
	[
		... await getBestAlbumsAllTimeDates(),
		... await getBestAlbumsOfDecadeDates(60),
		... await getBestAlbumsOfDecadeDates(70),
		... await getBestAlbumsOfDecadeDates(80),
		... await getBestAlbumsOfDecadeDates(90),
		... await getBestAlbumsOfDecadeDates(0),
		... await getBestAlbumsOfDecadeDates(10),
	];


/*
 * Last Fm scraping
 */

const getBandPhotoUrl = async (band: Band) => {
	const json = await request({
		url: `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${band.name}&api_key=${lastfm_api_key}&format=json`,
		json: true
	});
	return !!json.artist
		? json.artist.image[Math.min(3, json.artist.image.length - 1)]["#text"] as string
		: '';
}

const getAlbumPhotoUrl = async (album: Album): Promise<string> => {
	const json = await request({
		url: `http://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=${(album.band || { name: '' }).name}&album=${album.name}&api_key=${lastfm_api_key}&format=json`,
		json: true
	})
	return !!json.album
		? json.album.image[Math.min(3, json.album.image.length - 1)]["#text"] as string
		: '';
}
