const jsdom = require('jsdom')
const async = require('async')
const request = require('request')

var lastfm_api_key = process.env.LASTFM_API_KEY

var test = () => {
	console.log("Start")
	/*getAllBands().then((bands) => {
		console.log("Done merging number of bands: " + Object.keys(bands).length)
		for(var url in bands)
			console.log(bands[url])

	},(err) => {
		console.log(err)
	})

	getAllDatesFromScaruffiTopLists().then((albums) => {
		for(var i = 0; i < albums.length; i++)
			console.log(`Band: ${albums[i].band.name} Url: ${albums[i].band.url} Album: ${albums[i].name} Year: ${albums[i].year}`)
	})

	getBestAlbumsAllTimeDates().then((albums) => {
		for(var i = 0; i < albums.length; i++)
			console.log(`Band: ${albums[i].band.name} Url: ${albums[i].band.url} Album: ${albums[i].name} Year: ${albums[i].year}`)
	})*/

	getBandInfo({name: "ARCA", url:"vol8/arca.html"}).then( (band) => {
		console.log(band)
	})
}

/*
 * These functions scrape the jazz, rock and volume pages for bands
 */

var getBandsFromBandsPage = (url, selectionFunction) => {
	return new Promise((fulfill, reject) => {
		jsdom.env(
			url,
			[],
			(err, window) => {
					if(err)
						reject(err)
					else{
						var bandElements = selectionFunction(window)
						var bands = {}
						for(var i = 0; i < bandElements.length; i++){
							var bandUrl = bandElements[i].getAttribute("href").substring(3)
							if(bandUrl.indexOf('#') != -1)
								bandUrl = bandUrl.substring(0, bandUrl.indexOf('#'))
							bands[bandUrl] = {name: bandElements[i].innerHTML}
						}
						console.log(`Scraped ${bandElements.length} from ${url}`)
						fulfill(bands)
					}
			})
	})
}

var getRockBands = () => {
	var url = "http://scaruffi.com/music/groups.html"
	var selectionFunction = (window) => {
		return window.document.getElementsByTagName("table")[2].getElementsByTagName("a")
	}
	return getBandsFromBandsPage(url, selectionFunction)
}

var getJazzBands = () => {
	var url = "http://scaruffi.com/jazz/musician.html"
	var selectionFunction = (window) => {
		return window.document.querySelectorAll('[width="400"]')[0].getElementsByTagName("a")
	}
	return getBandsFromBandsPage(url, selectionFunction)
}

var getBandsFromVolume = (volume) => {
	var url = "http://scaruffi.com/vol"+volume
	var selectionFunction = (window) => {
		var elems = []
		var selectElems = window.document.getElementsByTagName("select")
		for(var i = 0; i < selectElems.length; i++)
			for(var j = 1; j < selectElems[i].options.length; j++){
				var elem = window.document.createElement("a")
				elem.innerHTML = selectElems[i].options[j].text.trim()
				var url = selectElems[i].options[j].getAttribute("value")
				if(url){
					url = url.substring(3, 6) == "vol" || url.substring(3, 8) == "avant" || url.substring(3, 7) == "jazz" ? url : `../vol${volume}/${url}`
					if(url.indexOf('#') != -1)
						url = url.substring(0, url.indexOf('#'))
					elem.setAttribute("href", url)
					elems.push(elem)
				}
			}
		return elems
	}
	return getBandsFromBandsPage(url, selectionFunction)
}

var getAllBands = () => {
	var bandPromises = [getJazzBands(), getRockBands()]
	var allBands = {}
	for(var i = 1; i < 2; i++)
		bandPromises.push(getBandsFromVolume(i))
	return new Promise((fulfill, reject) => {
		Promise.all(bandPromises).then((values) => {
			for(var i = 0; i< values.length; i ++)
				for (var url in values[i])
					if (values[i].hasOwnProperty(url)){
						allBands[url] = values[i][url]
						allBands[url]['url'] = url
					}
			var bandsArr = Object.keys(allBands).map((key) => { return allBands[key]})
			console.log(`Scraped ${bandsArr.length} bands in total`)
			fulfill(bandsArr)
		}, (err) => {
			reject(err)
		})
	})
}

/*
 * These functions scrape individual band pages for album ratings, band relations and bios
 */

var getBandInfo = (band) => {
	return new Promise((fulfill, reject) => {
		if(band.bio == null || band.bio == ''){
			var fullUrl = `http://scaruffi.com/${band.url}`
			jsdom.env(fullUrl, [], (err, window) => {
				if(err){
					reject(err)
				}else{
					if(window.document.getElementsByTagName('center').length > 0){
						var parentNode = window.document.getElementsByTagName('center')[0]

						while(parentNode.childNodes.length > 0){
							for(var i = 0; i < parentNode.childNodes.length; i++){
								band.name = parentNode.childNodes[i].textContent.trim()
								if(typeof band.name != 'undefined' && band.name.length > 0){
									parentNode = parentNode.childNodes[i]
									break
								}
							}
						}
					}

					band.bio = ''
					if(window.document.getElementsByTagName('table').length > 1){
						var tables = window.document.getElementsByTagName('table')[1].querySelectorAll('[bgcolor]')

						for(var i = 0; i < tables.length; i+=2){
							var table = tables[i]
							for(var j = 0; j < table.childNodes.length; j++){
								var childNode = table.childNodes[j]
								band.bio += (childNode.tagName == 'p' ? '\n' : '' ) + childNode.textContent
							}
						}
					}

					band.bio = band.bio.trim()
					if(window.document.getElementsByTagName('table').length > 0){
						var ablumsText = window.document.getElementsByTagName('table')[0].getElementsByTagName('td')[0].textContent
						var albumPattern = /.+, ([0-9]*.[0-9]+|[0-9]+)\/10/g
						var albumStrings = ablumsText.match(albumPattern)

						var albumNamePattern = /(^.+)(?=[(].*[)])|(^.+)(?=,)/
						var yearPattern = /[0-9]{4}(?=\))/
						var ratingPattern = /(([0-9].[0-9])|[0-9])(?=\/10)/

						band.albums = []
						if(albumStrings){
							for(var i = 0; i < albumStrings.length; i++){
								var albumString = albumStrings[i]
								band.albums.push({name: albumString.match(albumNamePattern) ? albumString.match(albumNamePattern)[0].trim() : "", year: albumString.match(yearPattern) ? albumString.match(yearPattern)[0] : 0, rating: albumString.match(ratingPattern) ? albumString.match(ratingPattern)[0] : 0})
							}
						}
					}
					if(window.document.getElementsByTagName("table").length > 1){
						var bioElements = window.document.getElementsByTagName("table")[1].querySelectorAll('[bgcolor]')
						band.relatedBands = []
						for(var i = 0; i < bioElements.length; i++){
							var bioElement = bioElements[i]
							for(var j = 0; j < bioElement.getElementsByTagName('a').length; j++){
								var relatedBandElement = bioElement.getElementsByTagName('a')[j]
								var relatedBand = {name: '', url: ''}
								relatedBand.name = relatedBandElement.textContent;
								relatedBand.url =  relatedBandElement.getAttribute("href");
								
								if( relatedBand.url && relatedBand.url.substring(0,3) == '../')
									relatedBand.url = relatedBand.url.substring(3)
								
								if( relatedBand.url && !( relatedBand.url.includes("vol") || relatedBand.url.includes("avant") || relatedBand.url.includes("jazz") ) )
									relatedBand.url = `vol${band.url.charAt(3) - '0'}/${relatedBand.url}`
								
								if( relatedBand.url &&
									!relatedBand.url.includes("mail") &&
									!relatedBand.url.includes("http") &&
									!relatedBand.url.includes("history") &&
									!relatedBand.url.includes("oldavant") &&
									relatedBand.name &&
									!relatedBand.name.includes("contact") &&
									!relatedBand.name.includes("contattami") )
									band.relatedBands.push(relatedBand);
							}
						}
					}
					console.log(`Scraped ${band.name}-${band.url}`)
					fulfill(band)
				}
			})
		}else{
			fulfill(band)
		}
	})
}

/*
 * These functions update album dates from best of all time and best of decades pages
 */

var getBestAlbumsAllTimeDates = () => {
	var url = "http://scaruffi.com/music/picbest.html"
	return new Promise((fulfill, reject) => {
		jsdom.env(url, [], (err, window) => {
			if(err)
				reject(err)
			else{
				var yearPattern = /[0-9]{4}(?=\.)/
				var albumNamePattern = /: .*/

				var albums = []

				var linerElements = window.document.getElementsByTagName("center")[0].getElementsByTagName("table")[0].getElementsByTagName("tr");

				for(var i = 0; i < linerElements.length; i++){
					var linerElement = linerElements[i]

					var bandAndAlbumName = linerElement.getElementsByTagName("td")[0].getElementsByTagName("font")[0].getElementsByTagName("b")[0];
					var linerNotes = linerElement.getElementsByTagName("td")[1].textContent;
					
					albums.push({
						year: linerNotes.match(yearPattern)[0],
						name: bandAndAlbumName.textContent.replace(/[\r\n]+/g," ").match(albumNamePattern)[0].substring(2),
						band: {
							name: bandAndAlbumName.getElementsByTagName("a")[0].textContent,
							url: bandAndAlbumName.getElementsByTagName("a")[0].getAttribute("href").substring(3)
						}
					})
				}

				fulfill(albums)
			}
		})
	})
}

var getBestAlbumsOfDecadeDates = (decade) => {
	var url = `http://scaruffi.com/ratings/${decade}.html`;
	return new Promise((fulfill, reject) =>{
		jsdom.env(url, [], (err, window) =>{
			if(err)
				reject(err)
			else{
				if(typeof window.document.getElementsByTagName("center")[0] == 'undefined')
					reject("Couldn't scrape page " + url)
				else{
					console.log("Scraping " + url + " for dates")
					var elements = window.document.getElementsByTagName("center")[0]
						.getElementsByTagName("table")[(decade == '00' || decade == 10) ? 3 : 2]
						.getElementsByTagName("tbody")[0]
						.getElementsByTagName("tr")[0]
						.getElementsByTagName("td")[0]
						.getElementsByTagName("ul")

					var albums = []

					var yearPattern = /[0-9]{4}(?=[)])/
					var bandNamePattern = /.*(?=:)/
					var albumNamePattern = /: .*(?=[(])/

					for(var i = 0; i < elements.length; i++){
						var albumElements = elements[i].getElementsByTagName("li")
						for(var j = 0; j < albumElements.length; j++){
							var bandAlbumName = albumElements[j].textContent.replace(/[\r\n]+/g," ")
							var album = {
								name: bandAlbumName.match(albumNamePattern) ? bandAlbumName.match(albumNamePattern)[0].substring(2) : null,
								year: bandAlbumName.match(yearPattern) ? bandAlbumName.match(yearPattern)[0] : null,
								band: {
									name: bandAlbumName.match(bandNamePattern) ? bandAlbumName.match(bandNamePattern)[0] : '',
									url: albumElements[j].getElementsByTagName('a').length > 0 ? albumElements[j].getElementsByTagName('a')[0].getAttribute('href').substring(3) : null
								}
							}
							if(album.band.url && typeof album.band.url != 'undefined' && album.band.url.indexOf('#') != -1)
								album.band.url = album.band.url.substring(0, album.band.url.indexOf('#'))
							if(album.name)
								albums.push(album)
						}
					}
					fulfill(albums)
				}
			}
		})
	})
}

var getAllDatesFromScaruffiTopLists = () =>{
	var datesPromises = [getBestAlbumsAllTimeDates(), getBestAlbumsOfDecadeDates(60), getBestAlbumsOfDecadeDates(70), getBestAlbumsOfDecadeDates(80), getBestAlbumsOfDecadeDates(90), getBestAlbumsOfDecadeDates('00'), getBestAlbumsOfDecadeDates(10)]
	return new Promise((fulfill, reject) => {
		Promise.all(datesPromises).then((values) => {
			var albums = []
			for(var i = 0; i < values.length; i++)
				albums = albums.concat(values[i])
			fulfill(albums)
		}, (err) => {
			reject(err)
		})
	})
}

/*
 * Last Fm scraping
 */

var getBandPhotoUrl = (band) => {
	var infoRequest = {
		url: `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${band.name}&api_key=${lastfm_api_key}&format=json`,
		json: true
	}
	return new Promise((fulfill, reject) => {
		request(infoRequest, (err, res, json) => {
			if(err)
				reject(err)
			else{
				if( typeof json.artist !== 'undefined' && json.artist ){
					band['imageUrl'] = json.artist.image[Math.min(3, json.artist.image.length-1)]["#text"]
					fulfill(band)
				}else{
					reject(`No photo for ${band.name} ${band.url}`)
				}
			}
		})
	})
}

var getAlbumPhotoUrl = (album) => {
	var infoRequest = {
		url: `http://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=${album.band.name}&album=${album.name}&api_key=${lastfm_api_key}&format=json`,
		json: true
	}
	return new Promise((fulfill, reject) => {
		request(infoRequest, (err, res, json) => {
			if(err){
				reject(err)
			}else{
				if ( typeof json.album !== 'undefined' && json.album){
					album['imageUrl'] = json.album.image[Math.min(3, json.album.image.length-1)]["#text"]
					fulfill(album)
				}else{
					reject(`No cover for ${album.name} ${album.band.url}`)
				}
			}
		})
	})
}

module.exports = {
	test: test,
	getAllBands: getAllBands,
	getBandInfo: getBandInfo,
	getBandPhotoUrl: getBandPhotoUrl,
	getAlbumPhotoUrl: getAlbumPhotoUrl
}