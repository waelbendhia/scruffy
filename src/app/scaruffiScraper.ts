
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

var lastfm_api_key = process.env.LASTFM_API_KEY;

var SCRAPE_TOTAL = 0;
var SCRAPE_PROGRESS = 0;
var REJECTED = 0;
var ALL_BANDS: Band[] = [];

/*
 * These functions scrape the jazz, rock and volume pages for bands
 */

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
	) as { [url: string]: { name: string } }[]
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


function getAllBands(): Promise<Band[]> {
	let allBands = {};

	let bandPromises = [getJazzBands(), getRockBands()];
	for (let i = 1; i < 9; i++) bandPromises.push(getBandsFromVolume(i));

	return new Promise(function (fulfill, reject) {
		Promise.all(bandPromises)
			.then(values => {
				for (let i = 0; i < values.length; i++)
					for (let url in values[i])
						if (values[i].hasOwnProperty(url)) {
							allBands[url] = values[i][url];
							allBands[url].url = url;
						}
				let bandsArr = Object.keys(allBands).map(key => allBands[key]);
				SCRAPE_TOTAL = bandsArr.length;
				SCRAPE_PROGRESS = 0;
				REJECTED = 0;
				ALL_BANDS = bandsArr;

				console.log(`Scraped ${SCRAPE_TOTAL} bands in total`);
				fulfill(bandsArr);
			})
			.catch(reject);
	});
}

/*
 * These functions scrape individual band pages for album ratings, band relations and bios
 */

function getBandNameFromBody($) {
	let name = '';
	if ($('center').get().length === 0)
		return name;

	let parentNode = $('center').get(0);
	while ($(parentNode).children().length > 0)
		for (let i = 0; i < $(parentNode).children().length; i++) {
			name = $($(parentNode).children().get(i)).text().trim();
			if (name) {
				parentNode = $(parentNode).children().get(i);
				break;
			}
		}

	return name;
}

function getBandBioFromBody($) {
	let bio = '';
	if ($('table').get().length > 1) {
		const tables = $('table:nth-of-type(2) [bgcolor]').get();
		for (let k = 0; k < tables.length; k += 2) {
			const table = tables[k];
			for (let j = 0; j < $(table).contents().get().length; j++) {
				const childNode = $(table).contents().get(j);
				bio += childNode.name == 'br' ?
					'\n' :
					(childNode.name == 'p' ? '\n\n\n' : ' ') + $(childNode).text().trim().replace(/\n/g, " ");
			}
		}
	}
	return bio.trim();
}

function getBandAlbumsFromBody($) {
	const albums = [];

	const albumPattern = /.+, ([0-9]*.[0-9]+|[0-9]+)\/10/g;
	const albumNamePattern = /(^.+)(?=[(].*[)])|(^.+)(?=,)/;
	const yearPattern = /[0-9]{4}(?=\))/;
	const ratingPattern = /(([0-9].[0-9])|[0-9])(?=\/10)/;

	if ($('table').get().length === 0)
		return albums;

	const ablumsText = $('table:nth-of-type(1) td:nth-of-type(1)').text();
	const albumStrings = ablumsText.match(albumPattern);

	if (!albumStrings)
		return albums;

	for (let i = 0; i < albumStrings.length; i++) {
		const albumString = albumStrings[i];
		albums.push({
			name: albumString.match(albumNamePattern) ? albumString.match(albumNamePattern)[0].trim() : "",
			year: albumString.match(yearPattern) ? albumString.match(yearPattern)[0] : 0,
			rating: albumString.match(ratingPattern) ? albumString.match(ratingPattern)[0] : 0
		});
	}

	return albums;
}

function getBandRelatedBandsFromBody($, band) {
	const relatedBands = [];

	function extractRelatedBandFromElement(relatedBandElement) {
		const relatedBand = {
			name: $(relatedBandElement).text(),
			url: $(relatedBandElement).attr("href")
		};
		if (!relatedBand.name || !relatedBand.url)
			return;
		relatedBand.url = relatedBand.url.replace('../', '');
		relatedBand.url = relatedBand.url.substring(0, relatedBand.url.indexOf('#'));
		relatedBand.url = (/vol|avant|jazz/.test(relatedBand.url) ? '' : `vol${band.url.charAt(3) - '0'}/`) + relatedBand.url;

		const nameIsValid = !(/contact|contattami/.test(relatedBand.name));
		const urlIsValid = !(/mail|http|history|oldavant|index/.test(relatedBand.url)) && (relatedBand.url.match(/\//g) || []).length == 1 && relatedBand.url != band.url;
		if (urlIsValid && nameIsValid)
			return relatedBand;
		return undefined;
	}

	if ($("table").get().length <= 1)
		return relatedBands;
	const bioElements = $("table:nth-of-type(2) [bgcolor]").get();
	for (let m = 0; m < bioElements.length; m++) {
		const bioElement = bioElements[m];
		for (let n = 0; n < $(bioElement).children('a').get().length; n++) {
			let relatedBand = extractRelatedBandFromElement($(bioElement).children('a').get(n));
			if (relatedBand) relatedBands.push(relatedBand);
		}
	}
	return relatedBands;
}

function getBandInfo(band: Band): Promise<Band> {
	return new Promise(fulfill => {
		request({
			uri: `http://scaruffi.com/${band.url}`,
			timeout: 30000,
			headers: headers
		}, function (err, res, body) {
			var index = ALL_BANDS.indexOf(band);
			if (err) {
				if (err.code === 'ETIMEDOUT')
					REJECTED++;
				console.log(band.url + " " + err + " " + REJECTED);
				band.name = 'ERROR';
			} else {
				var $ = cheerio.load(body);
				band.name = getBandNameFromBody($);
				band.bio = getBandBioFromBody($);
				band.albums = getBandAlbumsFromBody($);
				band.relatedBands = getBandRelatedBandsFromBody($, band);

				SCRAPE_PROGRESS++;
			}
			if (index != -1)
				ALL_BANDS.splice(index, 1);
			if (ALL_BANDS.length < 100 && ALL_BANDS.length > 0)
				console.log(ALL_BANDS.map(b => b.url).reduce((prev, cur) => prev + " " + cur) + "\n" + ALL_BANDS.length);
			else
				console.log(ALL_BANDS.length);
			fulfill(band);
		});
	});
}

/*
 * These functions update album dates from best of all time and best of decades pages
 */

function getBestAlbumsAllTimeDates() {
	return new Promise(function (fulfill, reject) {
		request({
			uri: "http://scaruffi.com/music/picbest.html",
			headers: headers
		}, function (err, res, body) {
			if (err)
				reject(err);
			else {
				var $ = cheerio.load(body);

				var yearPattern = /[0-9]{4}(?=\.)/;
				var albumNamePattern = /: .*/;

				var albums = [];

				var linerElements = $("center:nth-of-type(1) table:nth-of-type(1) tr").get();

				for (var i = 0; i < linerElements.length; i++) {
					var linerElement = linerElements[i];

					var bandAndAlbumName = $(linerElement).children("td").eq(0).children("font").eq(0).children("b").eq(0);
					var linerNotes = $(linerElement).children("td").eq(1).text();

					albums.push({
						year: linerNotes.match(yearPattern)[0],
						name: bandAndAlbumName.text().replace(/[\r\n]+/g, " ").match(albumNamePattern)[0].substring(2),
						band: {
							name: bandAndAlbumName.children("a").eq(0).text(),
							url: bandAndAlbumName.children("a").attr("href").substring(3)
						}
					});
				}
				fulfill(albums);
			}
		});
	});
}

function scrapeForAlbums($, elements) {
	const albums = [];
	const yearPattern = /[0-9]{4}(?=[)])/;
	const bandNamePattern = /.*(?=:)/;
	const albumNamePattern = /: .*(?=[(])/;

	for (let i = 0; i < elements.length; i++) {
		const albumElements = $(elements[i]).children("li").get();
		for (let j = 0; j < albumElements.length; j++) {
			const bandAlbumName = $(albumElements[j]).text().replace(/[\r\n]+/g, " ");
			const album = {
				name: bandAlbumName.match(albumNamePattern) ? bandAlbumName.match(albumNamePattern)[0].substring(2) : null,
				year: bandAlbumName.match(yearPattern) ? bandAlbumName.match(yearPattern)[0] : null,
				band: {
					name: bandAlbumName.match(bandNamePattern) ? bandAlbumName.match(bandNamePattern)[0] : '',
					url: $(albumElements[j]).children('a').get().length > 0 ? $(albumElements[j]).children('a').eq(0).attr('href').substring(3) : null
				}
			};
			album.band.url = album.band.url.substring(0, album.band.url.indexOf('#'));
			if (album.name)
				albums.push(album);
		}
	}
	return albums;
}

function getBestAlbumsOfDecadeDates(decade) {
	return new Promise(function (fulfill, reject) {
		request({
			uri: `http://scaruffi.com/ratings/${decade}.html`,
			headers: headers
		}, function (err, res, body) {
			if (err) {
				reject(err);
				return;
			}
			const $ = cheerio.load(body);

			if (!$("center").get(0)) {
				reject(`Couldn't scrape page http://scaruffi.com/ratings/${decade}.html`);
				return;
			}
			const elements = $("center").eq(0)
				.children("table").eq((decade == '00' || decade == 10) ? 3 : 2)
				.children("tbody").eq(0)
				.children("tr").eq(0)
				.children("td").eq(0)
				.children("ul").get();

			const albums = scrapeForAlbums($, elements);

			fulfill(albums);
		});
	});
}

function getAllDatesFromScaruffiTopLists() {
	var datesPromises = [getBestAlbumsAllTimeDates(), getBestAlbumsOfDecadeDates(60), getBestAlbumsOfDecadeDates(70), getBestAlbumsOfDecadeDates(80), getBestAlbumsOfDecadeDates(90), getBestAlbumsOfDecadeDates('00'), getBestAlbumsOfDecadeDates(10)];
	return new Promise(function (fulfill, reject) {
		Promise.all(datesPromises)
			.then(function (values) {
				var albums = [];
				for (var i = 0; i < values.length; i++)
					albums = albums.concat(values[i]);
				fulfill(albums);
			})
			.catch(reject);
	});
}

/*
 * Last Fm scraping
 */

function getBandPhotoUrl(band: Band): Promise<string> {
	return new Promise(function (fulfill, reject) {
		request({
			url: `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${band.name}&api_key=${lastfm_api_key}&format=json`,
			json: true
		}, function (err, res, json) {
			if (err)
				reject(err);
			else {
				if (!!json.artist) {
					fulfill(
						json.artist.image[Math.min(3, json.artist.image.length - 1)]["#text"]
					);
				} else
					reject(`No photo for ${band.name} ${band.url}`);
			}
		});
	});
}

function getAlbumPhotoUrl(album: Album): Promise<string> {
	return new Promise(function (fulfill, reject) {
		request({
			url: `http://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=${album.band.name}&album=${album.name}&api_key=${lastfm_api_key}&format=json`,
			json: true
		}, function (err, res, json) {
			if (err) {
				reject(err);
			} else {
				if (!!json.album) {
					fulfill(json.album.image[Math.min(3, json.album.image.length - 1)]["#text"]);
				} else {
					reject(`No cover for ${album.name} ${album.band.url}`);
				}
			}
		});
	});
}
