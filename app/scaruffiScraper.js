"use strict";
const cheerio = require('cheerio');
const async = require('async');
const request = require('request');

var lastfm_api_key = process.env.LASTFM_API_KEY;

var SCRAPE_TOTAL = 0;
var SCRAPE_PROGRESS = 0;
var REJECTED = 0;
var ALL_BANDS = [];

/*
 * These functions scrape the jazz, rock and volume pages for bands
 */

var getBandsFromBandsPage = (url, selectionFunction) => {
	return new Promise((fulfill, reject) => {
		request({
			uri: url,
			headers: {
				'User-Agent': 'request'
			}
		}, function (err, res, body) {
			if (err) {
				reject(err);
			} else {
				var $ = cheerio.load(body);
				var bandElements = selectionFunction($);
				var bands = {};

				for (var i = 0; i < bandElements.length; i++) {
					var bandUrl = $(bandElements[i]).attr('href').substring(3);
					if (bandUrl.indexOf('#') != -1)
						bandUrl = bandUrl.substring(0, bandUrl.indexOf('#'));
					bands[bandUrl] = {
						name: $(bandElements[i]).text().trim()
					};
				}
				console.log(`Scraped ${bandElements.length} from ${url}`);
				fulfill(bands);
			}
		});
	});
};

var getRockBands = () => {
	var url = "http://scaruffi.com/music/groups.html";
	var selectionFunction = ($) => {
		return $('table:nth-of-type(3) a').get();
	};
	return getBandsFromBandsPage(url, selectionFunction);
};

var getJazzBands = () => {
	var url = "http://scaruffi.com/jazz/musician.html";
	var selectionFunction = ($) => {
		return $('[width="400"] a').get();
	};
	return getBandsFromBandsPage(url, selectionFunction);
};

var getBandsFromVolume = (volume) => {
	var url = "http://scaruffi.com/vol" + volume;
	var selectionFunction = ($) => {
		var elems = [];
		$('select').each((i, elem) => {
			elems = elems.concat($(elem).children('option').slice(1).get());
		});
		elems.forEach((entry) => {
			var url = $(entry).attr('value');
			url = url.substring(3, 6) == "vol" || url.substring(3, 8) == "avant" || url.substring(3, 7) == "jazz" ? url : `../vol${volume}/${url}`;
			if (url.indexOf('#') != -1)
				url = url.substring(0, url.indexOf('#'));
			$(entry).attr('href', url);
		});
		return elems;
	};
	return getBandsFromBandsPage(url, selectionFunction);
};

var getAllBands = () => {
	var bandPromises = [getJazzBands(), getRockBands()];
	var allBands = {};
	for (var i = 1; i < 9; i++)
		bandPromises.push(getBandsFromVolume(i));
	return new Promise((fulfill, reject) => {
		Promise.all(bandPromises)
			.then((values) => {
				for (var i = 0; i < values.length; i++)
					for (var url in values[i])
						if (values[i].hasOwnProperty(url)) {
							allBands[url] = values[i][url];
							allBands[url].url = url;
						}
				var bandsArr = Object.keys(allBands).map((key) => {
					return allBands[key];
				});
				SCRAPE_TOTAL = bandsArr.length;
				SCRAPE_PROGRESS = 0;
				REJECTED = 0;
				ALL_BANDS = bandsArr;

				console.log(`Scraped ${SCRAPE_TOTAL} bands in total`);
				fulfill(bandsArr);
			})
			.catch(err => reject(err));
	});
};

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

	for (let l = 0; l < albumStrings.length; l++) {
		const albumString = albumStrings[l];
		albums.push({
			name: albumString.match(albumNamePattern) ? albumString.match(albumNamePattern)[0].trim() : "",
			year: albumString.match(yearPattern) ? albumString.match(yearPattern)[0] : 0,
			rating: albumString.match(ratingPattern) ? albumString.match(ratingPattern)[0] : 0
		});
	}

	return albums;
}

function getBandRelatedBandsFromBody($) {
	const relatedBands = [];

	function extractRelatedBandFromElement(relatedBandElement) {
		const relatedBand = {
			name: $(relatedBandElement).text(),
			url: $(relatedBandElement).attr("href")
		};
		if (!relatedBand.name || !relatedBand.url)
			return;
		const nameIsValid = !/contact|contattami/.test(relatedBand.name);
		const urlIsValid = !/mail|http|history|oldavant|index/.test(relatedBand.url) && (relatedBand.url.match(/\//g) || []).length == 1 && relatedBand.url != band.url;

		if (urlIsValid && nameIsValid) {
			relatedBand.url = relatedBand.url.replace('../', '');
			relatedBand.url = relatedBand.url.substring(0, relatedBand.url.indexOf('#'));
			relatedBand.url = (/vol|avant|jazz/.test(relatedBand.url) ? '' : `vol${band.url.charAt(3) - '0'}/`) + relatedBand.url;

			relatedBands.push(relatedBand);
		}
	}

	if ($("table").get().length <= 1)
		return relatedBands;
	const bioElements = $("table:nth-of-type(2) [bgcolor]").get();
	for (let m = 0; m < bioElements.length; m++) {
		const bioElement = bioElements[m];
		for (let n = 0; n < $(bioElement).children('a').get().length; n++)
			extractRelatedBandFromElement($(bioElement).children('a').get(n));
	}

	return relatedBands;
}

var getBandInfo = (band) => {
	return new Promise(fulfill => {
		request({
			uri: `http://scaruffi.com/${band.url}`,
			timeout: 30000,
			headers: {
				'User-Agent': 'request'
			}
		}, (err, res, body) => {
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
				band.relatedBands = getBandRelatedBandsFromBody($);

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
};

/*
 * These functions update album dates from best of all time and best of decades pages
 */

var getBestAlbumsAllTimeDates = () => {
	return new Promise((fulfill, reject) => {
		request({
			uri: "http://scaruffi.com/music/picbest.html",
			headers: {
				'User-Agent': 'request'
			}
		}, (err, res, body) => {
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
};

function scrapeForAlbums(elements) {
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

var getBestAlbumsOfDecadeDates = (decade) => {
	return new Promise((fulfill, reject) => {
		request({
			uri: `http://scaruffi.com/ratings/${decade}.html`,
			headers: {
				'User-Agent': 'request'
			}
		}, (err, res, body) => {
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

			const albums = scrapeForAlbums(elements);

			fulfill(albums);
		});
	});
};

var getAllDatesFromScaruffiTopLists = () => {
	var datesPromises = [getBestAlbumsAllTimeDates(), getBestAlbumsOfDecadeDates(60), getBestAlbumsOfDecadeDates(70), getBestAlbumsOfDecadeDates(80), getBestAlbumsOfDecadeDates(90), getBestAlbumsOfDecadeDates('00'), getBestAlbumsOfDecadeDates(10)];
	return new Promise((fulfill, reject) => {
		Promise.all(datesPromises)
			.then((values) => {
				var albums = [];
				for (var i = 0; i < values.length; i++)
					albums = albums.concat(values[i]);
				fulfill(albums);
			})
			.catch((err) => reject(err));
	});
};

/*
 * Last Fm scraping
 */

var getBandPhotoUrl = (band) => {
	var infoRequest = {
		url: `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${band.name}&api_key=${lastfm_api_key}&format=json`,
		json: true
	};
	return new Promise((fulfill, reject) => {
		request(infoRequest, (err, res, json) => {
			if (err)
				reject(err);
			else {
				if (typeof json.artist !== 'undefined' && json.artist) {
					band.imageUrl = json.artist.image[Math.min(3, json.artist.image.length - 1)]["#text"];
					fulfill(band);
				} else
					reject(`No photo for ${band.name} ${band.url}`);
			}
		});
	});
};

var getAlbumPhotoUrl = (album) => {
	var infoRequest = {
		url: `http://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=${album.band.name}&album=${album.name}&api_key=${lastfm_api_key}&format=json`,
		json: true
	};
	return new Promise((fulfill, reject) => {
		request(infoRequest, (err, res, json) => {
			if (err) {
				reject(err);
			} else {
				if (typeof json.album !== 'undefined' && json.album) {
					album.imageUrl = json.album.image[Math.min(3, json.album.image.length - 1)]["#text"];
					fulfill(album);
				} else {
					reject(`No cover for ${album.name} ${album.band.url}`);
				}
			}
		});
	});
};

module.exports = {
	getAllBands: getAllBands,
	getBandInfo: getBandInfo,
	getBandPhotoUrl: getBandPhotoUrl,
	getAlbumPhotoUrl: getAlbumPhotoUrl
};