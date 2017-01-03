const mysql = require('mysql')

const con = mysql.createConnection({
	host: "localhost",
	user: "wael",
	password: "",
	database: "scaruffi"
})

const SORT_BY_RATING = 0;
const SORT_BY_DATE = 1;
const SORT_BY_ALBUM_NAME = 2;
const SORT_BY_BANDNAME = 3;

con.connect()

var parseBandFromRow = function(row){
	var band = {
		name: row.name,
		url: row.partialUrl,
		bio: row.bio,
		fullurl: `http://scaruffi.com/${row.partialUrl}`,
		albums: [],
		relatedBands: []
	}
	return band
}

var parseAlbumFromRow = function(row){
	var album = {
		name: row.name,
		year: row.year,
		rating: row.rating,
		band: {}
	}
	return album
}

var getSortByAsString = function(sortBy, albumSymbol, bandSymbol){
	var ret = "";
	switch (sortBy) {
	case SORT_BY_RATING:
		ret = albumSymbol+".rating";
		break;
		
	case SORT_BY_DATE:
		ret = albumSymbol+".year";
		break;
		
	case SORT_BY_ALBUM_NAME:
		ret = albumSymbol+".name";
		break;
		
	case SORT_BY_BANDNAME:
		ret = bandSymbol+".name";
		break;

	default:
		break;
	}
	return ret;
}

var getRelatedBands = function(band, callback){
	var query = `select * from bands INNER JOIN bands2bands ON bands.partialUrl = bands2bands.urlOfRelated where bands2bands.urlOfBand ='${band.url}'`;
	con.query(query, function(err, rows){
		if(err)
			throw err
		for( i = 0; i < rows.length; i++ ){
			var relBand = parseBandFromRow(rows[i])
			relBand.bio = ''
			band.relatedBands.push(relBand)
		}
		callback(band)
	})
}

var getAlbums = function(band, callback){
	var query = `select * from albums where band ='${band.url}'`
	con.query(query, function(err, rows){
		if(err)
			throw err
		for( i = 0; i < rows.length; i++ ){
			band.albums.push(parseAlbumFromRow(rows[i]))
		}
		callback(band)
	})
}

module.exports.getBand = function(partialUrl, callback){
	var query = `select * from bands where partialUrl ='${partialUrl}'`;
	var firstBand
	var finalCallback = function(band){
		callback(band)
	}
	var callbackFromRelatedBands = function(band){
		firstBand = band
		getAlbums(firstBand, finalCallback)
	}
	con.query(query, function(err, rows){
		if(err)
			throw err;
		firstBand = parseBandFromRow(rows[0])
		getRelatedBands(firstBand, callbackFromRelatedBands)
	})
}

module.exports.getRatingDistribution = function(callback){
	var query = `SELECT floor(albums.rating*2)/2 as rating, count(*) as count FROM albums group by floor(albums.rating*2)/2;`;
	var disrib = {}
	con.query(query, function(err, rows){
		if(err)
			throw err;
		for(var i = 0; i < rows.length; i++){
			var row = rows[i]
			disrib[row.rating.toFixed(1)] = row.count
		}
		callback(disrib)
	})
}

module.exports.getBandCount = function(callback){
	var query = `select count(*) as count FROM bands;`;
	con.query(query, function(err, rows){
		if(err)
			throw err;
		callback(rows[0].count)
	})
}

module.exports.getBandsInfluential = function(callback){
	var query = `select count(b2b.urlOfBand) as inf, b.name, b.partialUrl FROM bands b inner join bands2bands b2b on b.partialUrl = b2b.urlOfRelated group by b2b.urlOfRelated order by inf desc limit 21`;
	var bands = []
	con.query(query, function(err, rows){
		if(err)
			throw err
		for( i = 0; i < rows.length; i++ ){
			var band = parseBandFromRow(rows[i])
			band.bio = ''
			bands.push(band)
		}
		callback(bands)
	})
}

module.exports.searchAlbums = function(req, callback){
	var query = "select a.name as name, a.year as year, a.rating as rating, b.name as bandname, b.partialUrl as bandurl from albums a inner join bands b on b.partialUrl = a.band where a.rating between "
		+ req.ratingLower + " and " + req.ratingHigher + " and "
		+ "(a.year between " + req.yearLower + " and " + req.yearHigher
		+ (req.includeUnknown ? " or a.year = 0" : "") + ") " 
		+ (!req.name ? "" : "and ( instr(lower(a.name), lower('" + req.name + "')) or instr(lower(b.name), lower('" + req.name + "'))) ") 
		+ "order by " + getSortByAsString(req.sortBy, "a", "b") + (req.sortOrderAsc ? " asc " : " desc ") 
		+ "limit " + (req.page * req.numberOfResults) + "," + req.numberOfResults + ";";

	var albums = []

	con.query(query, function(err, rows){
		if(err)
			throw err
		for( i = 0; i < rows.length; i++ ){
			var album = parseAlbumFromRow(rows[i])
			album.band = {
				name: rows[i].bandname,
				url: rows[i].bandurl,
				fullurl: `http://scaruffi.com/${rows[i].bandurl}`
			}
			albums.push(album)
		}
		callback(albums)
	})
}

module.exports.searchAlbumsCount = function(req, callback){
	var query = "select count(*) as count from albums a inner join bands b on b.partialUrl = a.band where a.rating between "
		+ req.ratingLower + " and " + req.ratingHigher + " and "
		+ "(a.year between " + req.yearLower + " and " + req.yearHigher
		+ (req.includeUnknown ? " or a.year = 0" : "") + ") " 
		+ (!req.name ? "" : "and ( instr(lower(a.name), lower('" + req.name + "')) or instr(lower(b.name), lower('" + req.name + "'))) ") + ";";

	con.query(query, function(err, rows){
		if(err)
			throw err
		callback(rows[0].count)
	})
}

module.exports.searchBands = function(req, callback){
	var query = "select b.partialUrl as partialUrl, b.name as name from bands b where "
				+ "instr(lower(b.name), lower('" + req.name + "')) " 
				+ " order by b.name "
				+ "limit " + (req.page * req.numberOfResults) + "," + req.numberOfResults + ";";

	var bands = []

	con.query(query, function(err, rows){
		if(err)
			throw err
		for( i = 0; i < rows.length; i++ ){
			var band = parseBandFromRow(rows[i])
			bands.push(band)
		}
		callback(bands)
	})
}

module.exports.searchBandsCount = function(req, callback){
	var query = "select count(*) as count from bands b where "
				+ "instr(lower(b.name), lower('" + req.name + "')) " + ";";

	con.query(query, function(err, rows){
		if(err)
			throw err
		callback(rows[0].count)
	})
}