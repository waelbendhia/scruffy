const mysql = require('mysql')
const request = require('request');
const async = require('async')

var db_host = process.env.MYSQL_HOST || "localhost"
var db_user = process.env.MYSQL_USER || "wael"
var db_password = process.env.MYSQL_PASSWORD || ""
var db_database = process.env.MYSQL_DATABASE || "scaruffi"
var lastfm_api_key = process.env.LASTFM_API_KEY || '39720b3f01a98c70c1f32e82b71499e1'

const pool = mysql.createPool({
	connectionLimit : 100,
	host : db_host,
	user : db_user,
	password : db_password,
	database : db_database,
	debug : false
});

var getConnection = function(){
	return new Promise(function(fulfill, reject){
		pool.getConnection(function(err, connection){
			if(err){
				reject(err)
			}else
				fulfill(connection)
		})
	})
}

var filterForSql = function(string){
	return string.replace(/'/, "\\'")
}

const SORT_BY_RATING = 0;
const SORT_BY_DATE = 1;
const SORT_BY_ALBUM_NAME = 2;
const SORT_BY_BANDNAME = 3;

var updateEmptyBandPhotos = function(){
	var query = `select * from bands where imageUrl = '' or imageUrl is null`
	getConnection().then(function(con){
		con.query(query, function(err, rows){
			con.release()
			if(err)
				console.log(err)
			else{
				var bands = []
				for(var i = 0; i < rows.length; i++)
					bands.push(parseBandFromRow(rows[i]))
				async.map(bands, insertBandPhotoUrl)
			}
		})
	})
}

var dropTables = function(){
	var dropQuery = "drop table if exists bands2bands, albums, bands;"
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.query(dropQuery, function(err, rows){
				con.release()
				if(err)
					reject(err)
				else
					fulfill(rows)
			})
		})
	})
}

var createTables = function(){
	var createBandsQuery     = "create table bands( partialUrl varchar(45) not null primary key, name varchar(45) not null, bio text, imageUrl varchar(120));"
	var createAlbumsQuery    = "create table albums( name varchar(80) not null, year int(11), rating float, band varchar(45) not null, imageUrl varchar(120), CONSTRAINT pk_albumID PRIMARY KEY (name,band), FOREIGN KEY (band) REFERENCES bands(partialUrl));"
	var createBand2Bandquery = "create table bands2bands( urlOfBand varchar(45) not null, urlOfRelated varchar(45) not null, CONSTRAINT pk_b2bID PRIMARY KEY (urlOfBand, urlOfRelated), FOREIGN KEY (urlOfBand) REFERENCES bands(partialUrl), FOREIGN KEY (urlOfRelated) REFERENCES bands(partialUrl));"
	var fuls = []
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.query(createBandsQuery, function(err, rows){
				if(err){
					con.release()
					reject(err)
				}else{
					fuls.push(rows)
					con.query(createAlbumsQuery, function(err, rows){
						if(err){
							con.release()
							reject(err)
						}else{
							fuls.push(rows)
							con.query(createBand2Bandquery, function(err, rows){
								con.release()
								if(err)
									reject(err)
								else{
									fuls.push(rows)
									fulfill(fuls)
								}
							})
						}
					})
				}
			})
		})
	})
}

var updateEmptyAlbumPhotos = function(){
	var query = `select a.name as name, a.year as year, a.rating as rating, a.band as bandUrl, b.name as bandName from albums a inner join bands b on a.band = b.partialUrl  where a.imageUrl = '' or a.imageUrl is null;`
	getConnection().then(function(con){
		con.query(query, function(err, rows){
			con.release()
			if(err)
				console.log(err)
			else{
				var albums = []
				for(var i = 0; i < rows.length; i++){
					albums.push(parseAlbumFromRow(rows[i]))
					albums[i].band = {
						name: rows[i].bandName,
						url: rows[i].bandUrl
					}
				}
				async.map(albums, insertAlbumPhotoUrl)
			}
		})
	})
}

var insertBandPhotoUrl = function(band){
	var infoRequest = {
		url: `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${band.name}&api_key=${lastfm_api_key}&format=json`,
		json: true
	} 
	request(infoRequest, function(err, res, json){
		if(err){
			console.log(`No photo for ${band.name} ${band.url}`)
		}else{
			if ( typeof json.artist !== 'undefined' && json.artist ){
				var imageUrl = json.artist.image[Math.min(3, json.artist.image.length-1)]["#text"]
				getConnection().then(function(con){
					con.query('update bands set imageUrl = ? where partialUrl = ?', [imageUrl, band.url], function(err, result){
						con.release()
						if(err)
							console.log(`No photo for ${band.name} ${band.url}`)
						else
							console.log(`Updating photo for ${band.name} ${band.url}`)
					})
				})
			}else{
				console.log(`No photo for ${band.name} ${band.url}`)
			}
		}
	})
}

var insertAlbumPhotoUrl = function(album){
	var infoRequest = {
		url: `http://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=${album.band.name}&album=${album.name}&api_key=${lastfm_api_key}&format=json`,
		json: true
	}
	request(infoRequest, function(err, res, json){
		if(err){
			console.log(`No entry found for ${album.name} ${album.band.url}`)
		}else{
			if ( typeof json.album !== 'undefined' && json.album){
				var imageUrl = json.album.image[Math.min(3, json.album.image.length-1)]["#text"]
				getConnection().then(function(con){
					con.query('update albums set imageUrl = ? where name = ? and band = ?', [imageUrl, album.name ,album.band.url], function(err, result){
						con.release()
						if(err){
							throw err
							console.log(`Could not insert for ${album.name} ${album.band.url}`)
						}
						else
							console.log(`Updating cover for ${album.name} ${album.band.url}`)
					})
				})
			}else{
				console.log(`No cover for ${album.name} ${album.band.url}`)
			}
		}
	})
}

var parseBandFromRow = function(row){
	var band = {
		name: row.name,
		url: row.partialUrl,
		bio: row.bio,
		imageUrl: row.imageUrl,
		fullUrl: `http://scaruffi.com/${row.partialUrl}`,
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
		imageUrl: row.imageUrl,
		band: {}
	}
	return album
}

var getSortByAsString = function(sortBy, albumSymbol, bandSymbol){
	var ret = "";
	switch (parseInt(sortBy)) {
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
		ret= "DEFAULT"
		break;
	}
	return ret;
}

var getRelatedBands = function(band){
	var query = `select * from bands INNER JOIN bands2bands ON bands.partialUrl = bands2bands.urlOfRelated where bands2bands.urlOfBand ='${filterForSql(band.url)}'`;
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.query(query, function(err, rows){
				con.release()
				if(err)
					reject(err)
				else{
					var relatedBands = []
					for(var i = 0; i < rows.length; i++){
						var relBand = parseBandFromRow(rows[i])
						relBand.bio = ''
						relatedBands.push(relBand)
					}
					fulfill(relatedBands)
				}
			})
		}, function(err){
			con.release()
			reject(err)	
		})
	})
}

var getAlbums = function(band){
	var query = `select * from albums where band ='${filterForSql(band.url)}'`
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.query(query, function(err, rows){
				con.release()
				if(err)
					reject(err)
				else{
					var albums = []
					for(var i = 0; i < rows.length; i++){
						albums.push(parseAlbumFromRow(rows[i]))
					}
					fulfill(albums)
				}
			})
		}, function(err){
			con.release()
			reject(err)	
		})
	})
}

module.exports.resetDatabase = function(){
	dropTables().then( (rows) => {
		console.log("Dropped tables.")
		createTables().then( (rows) =>{
			console.log("Created tables.")
		}, (err) => {
			console.log(err)
		})
	}, (err) => {
		console.log(err)
	})
}

module.exports.updateDatabase = function(){
	updateEmptyBandPhotos()
	updateEmptyAlbumPhotos()
}

module.exports.getBand = function(partialUrl){
	var query = `select * from bands where partialUrl ='${filterForSql(partialUrl)}'`;
	var band
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.query(query, function(err, rows){
				con.release()
				if(err)
					reject(err)
				else{
					band = parseBandFromRow(rows[0])
					Promise.all([getAlbums(band), getRelatedBands(band)]).then((values) => {
						band.albums = values[0]
						band.relatedBands = values[1]
						fulfill(band)
					})
				}
			})
		}, function(err){
			con.release()
			reject(err)	
		})
	})
}

module.exports.getRatingDistribution = function(){
	var query = `SELECT floor(albums.rating*2)/2 as rating, count(*) as count FROM albums group by floor(albums.rating*2)/2;`;
	var disrib = {}
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.release()
			con.query(query, function(err, rows){
				if(err)
					reject(err)
				else{
					for(var i = 0; i < rows.length; i++){
						disrib[rows[i].rating.toFixed(1)] = rows[i].count
					}
					fulfill(disrib)
				}
			})
		}, function(err){
			con.release()
			reject(err)	
		})
	})
}

module.exports.getBandCount = function(){
	var query = `select count(*) as count FROM bands;`;
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.query(query, function(err, rows){
				con.release()
				if(err)
					reject(err)
				else
					fulfill(rows[0].count)
			})
		}, function(err){
			con.release()
			reject(err)	
		})
	})
}

module.exports.getBandsInfluential = function(){
	var query = `select count(b2b.urlOfBand) as inf, b.name, b.partialUrl FROM bands b inner join bands2bands b2b on b.partialUrl = b2b.urlOfRelated group by b2b.urlOfRelated order by inf desc limit 21`;
	var bands = []
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.query(query, function(err, rows){
				if(err)
					reject(err)
				else{
					for(var i = 0; i < rows.length; i++){
						var band = parseBandFromRow(rows[i])
						band.bio = ''
						bands.push(band)
					}
					fulfill(bands)
				}
			})
		}, function(err){
			con.release()
			reject(err)	
		})
	})
}

module.exports.searchAlbums = function(req){
	var query = "select a.name as name, a.imageUrl as imageUrl, a.year as year, a.rating as rating, b.name as bandname, b.partialUrl as bandurl from albums a inner join bands b on b.partialUrl = a.band where a.rating between "
		+ req.ratingLower + " and " + req.ratingHigher + " and "
		+ "(a.year between " + req.yearLower + " and " + req.yearHigher
		+ (req.includeUnknown ? " or a.year = 0" : "") + ") " 
		+ (!req.name ? "" : "and ( instr(lower(a.name), lower('" + filterForSql(req.name) + "')) or instr(lower(b.name), lower('" + filterForSql(req.name) + "'))) ") 
		+ "order by " + getSortByAsString(req.sortBy, "a", "b") + (req.sortOrderAsc ? " asc " : " desc ") 
		+ "limit " + (req.page * req.numberOfResults) + "," + req.numberOfResults + ";";

	var albums = []
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.query(query, function(err, rows){
				con.release()
				if(err)
					reject(err)
				else{
					for( i = 0; i < rows.length; i++ ){
						var album = parseAlbumFromRow(rows[i])
						album.band = {
							name: rows[i].bandname,
							url: rows[i].bandurl,
							fullurl: `http://scaruffi.com/${rows[i].bandurl}`
						}
						albums.push(album)
					}
					fulfill(albums)
				}
			})
		}, function(err){
			reject(err)	
		})
	})
}

module.exports.searchAlbumsCount = function(req){
	var query = "select count(*) as count from albums a inner join bands b on b.partialUrl = a.band where a.rating between "
		+ req.ratingLower + " and " + req.ratingHigher + " and "
		+ "(a.year between " + req.yearLower + " and " + req.yearHigher
		+ (req.includeUnknown ? " or a.year = 0" : "") + ") " 
		+ (!req.name ? "" : "and ( instr(lower(a.name), lower('" + filterForSql(req.name) + "')) or instr(lower(b.name), lower('" + filterForSql(req.name) + "'))) ") + ";";
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.release()
			con.query(query, function(err, rows){
				if(err)
					reject(err)
				else
					fulfill(rows[0].count)
			})
		}, function(err){
			con.release()
			reject(err)	
		})
	})

}

module.exports.searchBands = function(req, callback){
	var query = "select b.partialUrl as partialUrl, b.name as name, b.imageUrl as imageUrl from bands b where "
				+ "instr(lower(b.name), lower('" + filterForSql(req.name) + "')) " 
				+ " order by b.name "
				+ "limit " + (req.page * req.numberOfResults) + "," + req.numberOfResults + ";";

	var bands = []
	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.query(query, function(err, rows){
				con.release()
				if(err)
					reject(err)
				for( i = 0; i < rows.length; i++ ){
					var band = parseBandFromRow(rows[i])
					bands.push(band)
				}
				fulfill(bands)
			})
		}, function(err){
			con.release()
			reject(err)	
		})
	})
}

module.exports.searchBandsCount = function(req, callback){
	var query = "select count(*) as count from bands b where "
				+ "instr(lower(b.name), lower('" + filterForSql(req.name) + "')) " + ";";

	return new Promise(function(fulfill, reject){
		getConnection().then(function(con){
			con.release()
			con.query(query, function(err, rows){
				if(err)
					reject(err)
				else
					fulfill(rows[0].count)
			})
		}, function(err){
			con.release()
			reject(err)	
		})
	})

}