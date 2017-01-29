const request = require('request')
const jsdom = require('jsdom')
const async = require('async')

var lastfm_api_key = process.env.LASTFM_API_KEY

module.exports.test = function() {
	console.log("Start")
	/*getAllBands().then(function(bands){
		console.log("Done merging number of bands: " + Object.keys(bands).length)
		for(var url in bands)
			console.log(bands[url])

	},function(err){
		console.log(err)
	})*/
	getBandInfo({name: "ARCA", url:"vol8/arca.html"}).then(function(band){
		console.log(band)
	})
}

/*
** These functions scrape the jazz, rock and volume pages for bands
 */

var getBandsFromBandsPage = function(url, selectionFunction){
	return new Promise(function(fulfill, reject){
		jsdom.env(
			url,
			[],
			function(err, window){
					if(err)
						reject(err)
					else{
						var bandElements = selectionFunction(window)
						var bands = {}
						for(var i = 0; i < bandElements.length; i++)
							bands[bandElements[i].getAttribute("href").substring(3)] = {name: bandElements[i].innerHTML}
						console.log(`Scraped ${bandElements.length} from ${url}`)
						fulfill(bands)
					}
			})
	})
}

var getRockBands = function(){
	var url = "http://scaruffi.com/music/groups.html"
	var selectionFunction = function(window){
		return window.document.getElementsByTagName("table")[2].getElementsByTagName("a")
	}
	return getBandsFromBandsPage(url, selectionFunction)
}

var getJazzBands = function(){
	var url = "http://scaruffi.com/jazz/musician.html"
	var selectionFunction = function(window){
		return window.document.querySelectorAll('[width="400"]')[0].getElementsByTagName("a")
	}
	return getBandsFromBandsPage(url, selectionFunction)
}

var getBandsFromVolume = function(volume){
	var url = "http://scaruffi.com/vol"+volume
	var selectionFunction = function(window){
		var elems = []
		var selectElems = window.document.getElementsByTagName("select")
		for(var i = 0; i < selectElems.length; i++)
			for(var j = 1; j < selectElems[i].options.length; j++){
				var elem = window.document.createElement("a")
				elem.innerHTML = selectElems[i].options[j].text.trim()
				var url = selectElems[i].options[j].getAttribute("value")
				if(url){
					url = url.substring(3, 6) == "vol" || url.substring(3, 8) == "avant" || url.substring(3, 7) == "jazz" ? url : `../vol${volume}/${url}`
					elem.setAttribute("href", url)
					elems.push(elem)
				}
			}
		return elems
	}
	return getBandsFromBandsPage(url, selectionFunction)
}

var getAllBands = function(){
	var bandPromises = [getJazzBands(), getRockBands()]
	var allBands = {}
	for(var i = 1; i < 10; i++)
		bandPromises.push(getBandsFromVolume(i))
	return new Promise(function(fulfill, reject){
		Promise.all(bandPromises).then(function(values){
			for(var i = 0; i< values.length; i ++)
				for (var url in values[i])
					if (values[i].hasOwnProperty(url)){
						allBands[url] = values[i][url]
						allBands[url]['url'] = url
					}
			fulfill(allBands)
		}, function(err){
			reject(err)
		})
	})
}

/*
** These functions scrape individual band pages for album ratings, band relations and bios
 */

var getBandInfo = function(band){
	return new Promise(function(fulfill, reject){
		if(band.bio == null || band.bio == ''){
			var fullUrl = `http://scaruffi.com/${band.url}`
			jsdom.env(fullUrl, [], function(err, window){
				if(err)
					reject(err)
				else{
					band.name = window.document.getElementsByTagName('center')[0].getElementsByTagName('font')[0].textContent

					band.bio = ''
					var tables = window.document.getElementsByTagName('table')[1].querySelectorAll('[bgcolor]')

					for(var i = 0; i < tables.length; i++){
						var table = tables[i]
						for(var j = 0; j < table.childNodes.length; j++){
							var childNode = table.childNodes[j]
							band.bio += (childNode.tagName == 'p' ? '\n' : '' ) + childNode.textContent
						}
					}

					var ablumsText = window.document.getElementsByTagName('table')[0].getElementsByTagName('td')[0].textContent
					var albumPattern = /.+, ([0-9]*.[0-9]+|[0-9]+)\/10/g
					var albumStrings = ablumsText.match(albumPattern)

					var albumNamePattern = /(^.+)(?=[(].*[)])|(^.+)(?=,)/
					var yearPattern = /[0-9]{4}(?=\))/
					var ratingPattern = /(([0-9].[0-9])|[0-9])(?=\/10)/

					band.albums = []

					for(var i = 0; i < albumStrings.length; i++){
						var albumString = albumStrings[i]
						band.albums.push({name: albumString.match(albumNamePattern)[0], year: albumString.match(yearPattern)[0], rating: albumString.match(ratingPattern)[0]})
					}

					var bioElements = window.document.getElementsByTagName("table")[1].querySelectorAll('[bgcolor]')
					band.relatedBands = []
					for(var i = 0; i < bioElements.length; i++){
						var bioElement = bioElements[i]
						for(var j = 0; j < bioElement.getElementsByTagName('a').length; j++){
							var relatedBandElement = bioElement.getElementsByTagName('a')[j]
							var relatedBand = {name: '', url: ''}
							relatedBand.name = relatedBandElement.textContent;
							relatedBand.url =  relatedBandElement.getAttribute("href");
							if(relatedBand.url && relatedBand.url.substring(0,3) == '../')
								relatedBand.url = relatedBand.url.substring(3)
							if(relatedBand.url && !( relatedBand.url.includes("vol") || relatedBand.url.includes("avant") || relatedBand.url.includes("jazz") ) )
								relatedBand.url = `vol${band.url.charAt(3) - '0'}/${band.url}`
							if( relatedBand.url && !relatedBand.url.includes("mail") && !relatedBand.url.includes("http") && !relatedBand.url.includes("history") && !relatedBand.url.includes("oldavant") && relatedBand.name && !relatedBand.name.includes("contact") && !relatedBand.name.includes("contattami") )
								band.relatedBands.push(relatedBand);
						}
					}
					fulfill(band)
				}
			})
		}else{
			fulfill(band)
		}
	})
}