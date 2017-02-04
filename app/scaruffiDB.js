const mysql = require('mysql')
const async = require('async')
const scraper = require('./scaruffiScraper.js')

var db_host = process.env.MYSQL_HOST || "localhost"
var db_user = process.env.MYSQL_USER || "wael"
var db_password = process.env.MYSQL_PASSWORD || ""
var db_database = process.env.MYSQL_DATABASE || "myapp_test"//"scaruffi"
var lastfm_api_key = process.env.LASTFM_API_KEY

const pool = mysql.createPool({
	connectionLimit : 100,
	host : db_host,
	user : db_user,
	password : db_password,
	database : db_database,
	debug : false
});

var getConnection = () => {
	return new Promise((fulfill, reject) => {
		pool.getConnection((err, connection) => {
			if(err){
				reject(err)
			}else
				fulfill(connection)
		})
	})
}

var filterForSql = (string) => {
	return string.replace(/'/, "\\'")
}

const SORT_BY_RATING = 0;
const SORT_BY_DATE = 1;
const SORT_BY_ALBUM_NAME = 2;
const SORT_BY_BANDNAME = 3;

var dropTables = () => {
	var dropQuery = "drop table if exists bands2bands, albums, bands;"
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query(dropQuery, (err, rows) => {
				con.release()
				if(err)
					reject(err)
				else
					fulfill(rows)
			})
		})
	})
}

var createTables = () => {
	var createBandsQuery     = "create table bands( partialUrl varchar(45) not null primary key, name varchar(45) not null, bio text, imageUrl varchar(120));"
	var createAlbumsQuery    = "create table albums( name varchar(80) not null, year int(11), rating float, band varchar(45) not null, imageUrl varchar(120), CONSTRAINT pk_albumID PRIMARY KEY (name,band), FOREIGN KEY (band) REFERENCES bands(partialUrl));"
	var createBand2Bandquery = "create table bands2bands( urlOfBand varchar(45) not null, urlOfRelated varchar(45) not null, CONSTRAINT pk_b2bID PRIMARY KEY (urlOfBand, urlOfRelated), FOREIGN KEY (urlOfBand) REFERENCES bands(partialUrl), FOREIGN KEY (urlOfRelated) REFERENCES bands(partialUrl));"
	var fuls = []
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query(createBandsQuery, (err, rows) => {
				if(err){
					con.release()
					reject(err)
				}else{
					fuls.push(rows)
					con.query(createAlbumsQuery, (err, rows) => {
						if(err){
							con.release()
							reject(err)
						}else{
							fuls.push(rows)
							con.query(createBand2Bandquery, (err, rows) => {
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

var updateDatabase = () => {
	scraper.getAllBands().then((bands) => {
		Promise.all(bands.map(scraper.getBandInfo)).then((fullBands) => {
			console.log(`Completed scrape of ${fullBands.length}`)
			Promise.all(fullBands.map(insertOrUpdateFull)).then((values) => {
				console.log("Update complete")
				updateEmptyBandPhotos()
				updateEmptyAlbumPhotos()
			}).catch((err) => {
				console.log(err)
			})
		}).catch((err) => {
			console.log(err)
		})
	})
}

var resetDatabase = () => {
	dropTables().then( (rows) => {
		console.log("Dropped tables.")
		createTables().then( (rows) =>{
			console.log("Created tables.")
			updateDatabase()
		}, (err) => {
			console.log(err)
		})
	}, (err) => {
		console.log(err)
	})
}

var updateEmptyBandPhotos = () => {
	var query = `select * from bands where imageUrl = '' or imageUrl is null`
	getConnection().then((con) => {
		con.query(query, (err, rows) => {
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

var insertBandLazy = (band) => {
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query('insert into bands (partialUrl, name, bio) values (?, ?, ?)', [band.url, band.name, band.bio], (err, result) => {
				con.release()
				if(err)
					reject(`Insertion of ${band.name}-${band.url} failed\n${err}`)
				else
					fulfill(`Insertion of ${band.name}-${band.url} successful`)
			})
		}, (err) => {
			reject(err)
		})		
	})
}

var insertOrUpdateFull = (band) => {
	return new Promise((fulfill, reject) => {
		insertBandLazy(band).then((suc) => {
			console.log(suc)
			insertFull(band)
		}, (err) => {
			console.log(err)
		})
		var insertFull = (band) => {
			getConnection().then((con) => {
				con.query('update bands set name = ?, bio = ? where partialURl = ?', [band.name, band.bio, band.url], (err, result) => {
					con.release()
					if(err)
						reject(`Insertion of ${band.name}-${band.url} failed\n${err}`)
					else{
						if(band.relatedBands && band.relatedBands.length > 0)
							for(var i = 0; i < band.relatedBands.length; i++)
								insertLazyThenInsertRelation(band, band.relatedBands[i])
						if(band.albums && band.albums.length > 0)
							for(var i = 0; i < band.albums.length; i++)
								insertAlbum(band, band.albums[i])
						fulfill(`Insertion of ${band.name}-${band.url} successful`)
					}
				})
			}, (err) => {
				reject(err)
			})
		}
		var insertLazyThenInsertRelation = (band, related) => {
			insertBandLazy(related).then((message) => {
				console.log(message)
				insertRelationLocal(band, related)
			}, (err) => {
				console.log(err)
				insertRelationLocal(band, related)
			})
		}
		var insertRelationLocal = (band, related) => {
			insertRelation(band, related).then((message) => {
				console.log(message)
			}, (err) => {
				console.log(message)
			})
		}
	})
}

var insertBandRelation = (band, related) => {
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query('insert into bands2bands (urlOfBand, urlOfRelated) values (?, ?)', [band.url, related.url], (err, result) => {
				if(err)
					reject(`Insertion of ${band.name}-${band.url} and ${related.name}-${related.url} failed\n${err}`)
				else
					fulfill(`Insertion of ${band.name}-${band.url} and ${related.name}-${related.url} successful`)
			})
		}, (err) => {
			reject(err)
		})
	})
}

var insertAlbum = (band, album) => {
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query('insert into albums (name, year, rating, band) values (?, ?, ?, ?)', [album.name, album.year, album.rating, band.url], (err, result) => {
				con.release()
				if(err)
					reject(`Insertion of ${album.name}-${band.url} failed\n${err}`)
				else
					fulfill(`Insertion of ${album.name}-${band.url} successful`)
			})
		}, (err) => {
			reject(err)
		})
	})
}

var updateEmptyAlbumPhotos = () => {
	var query = `select a.name as name, a.year as year, a.rating as rating, a.band as bandUrl, b.name as bandName from albums a inner join bands b on a.band = b.partialUrl  where a.imageUrl = '' or a.imageUrl is null;`
	getConnection().then((con) => {
		con.query(query, (err, rows) => {
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

var insertBandPhotoUrl = (band) => {
	scraper.getBandPhotoUrl(band).then((band) => {
		getConnection().then((con) => {
			con.query('update bands set imageUrl = ? where partialUrl = ?', [band.imageUrl, band.url], (err, result) => {
				con.release()
				if(err)
					if(err.code == 'ETIMEDOUT'){
						console.log(`Timed out on ${band.name}-${band.url} trying again`)
						insertBandPhotoUrl(band)
					}else
						console.log(`No photo for ${band.name} ${band.url}`)
				else
					console.log(`Updating photo for ${band.name} ${band.url}`)
			})
		}, (err) => {
			if(err.code == 'ETIMEDOUT'){
				console.log(`Timed out on ${band.name}-${band.url} trying again`)
				insertBandPhotoUrl(band)
			}else
				console.log(err)
		})
	})
}

var insertAlbumPhotoUrl = (album) => {
	scraper.getAlbumPhotoUrl(album).then((album) => {
		getConnection().then((con) => {
			con.query('update albums set imageUrl = ? where name = ? and band = ?', [album.imageUrl, album.name ,album.band.url], (err, result) => {
				con.release()
				if(err)
					console.log(`Could not insert for ${album.name} ${album.band.url}`)
				else
					console.log(`Updating cover for ${album.name} ${album.band.url}`)
			})
		})
	}, (err) => {
		if(err.code == 'ETIMEDOUT'){
			console.log(`Timed out on ${album.name}-${album.band.url} trying again`)
			insertAlbumPhotoUrl(album)
		}else
			console.log(err)
	})
}

var parseBandFromRow = (row) => {
	var band = {
		name: row.name,
		url: row.partialUrl,
		bio: row.bio ? row.bio : "",
		imageUrl: row.imageUrl,
		fullUrl: `http://scaruffi.com/${row.partialUrl}`,
		albums: [],
		relatedBands: []
	}
	return band
}

var parseAlbumFromRow = (row) => {
	var album = {
		name: row.name,
		year: row.year,
		rating: row.rating,
		imageUrl: row.imageUrl,
		band: {}
	}
	return album
}

var getSortByAsString = (sortBy, albumSymbol, bandSymbol) => {
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

var getRelatedBands = (band) => {
	var query = `select * from bands INNER JOIN bands2bands ON bands.partialUrl = bands2bands.urlOfRelated where bands2bands.urlOfBand ='${filterForSql(band.url)}'`;
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query(query, (err, rows) => {
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
		}, (err) => {
			con.release()
			reject(err)	
		})
	})
}

var getAlbums = (band) => {
	var query = `select * from albums where band ='${filterForSql(band.url)}'`
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query(query, (err, rows) => {
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
		}, (err) => {
			con.release()
			reject(err)	
		})
	})
}

var getBand = (partialUrl) => {
	var query = `select * from bands where partialUrl ='${filterForSql(partialUrl)}'`;
	var band
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query(query, (err, rows) => {
				con.release()
				if(err)
					reject(err)
				else{
					if(rows.length > 0){
						band = parseBandFromRow(rows[0])
						Promise.all([getAlbums(band), getRelatedBands(band)]).then((values) => {
							band.albums = values[0]
							band.relatedBands = values[1]
							fulfill(band)
						}).catch((err) => {
							console.log(err)
						})
					}else{
						reject("Could not find band for " + partialUrl)
					}
				}
			})
		}, (err) => {
			con.release()
			reject(err)	
		})
	})
}

var getRatingDistribution = () => {
	var query = `SELECT floor(albums.rating*2)/2 as rating, count(*) as count FROM albums group by floor(albums.rating*2)/2;`;
	var disrib = {}
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.release()
			con.query(query, (err, rows) => {
				if(err)
					reject(err)
				else{
					for(var i = 0; i < rows.length; i++){
						disrib[rows[i].rating.toFixed(1)] = rows[i].count
					}
					fulfill(disrib)
				}
			})
		}, (err) => {
			con.release()
			reject(err)	
		})
	})
}

var getBandCount = () => {
	var query = `select count(*) as count FROM bands;`;
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query(query, (err, rows) => {
				con.release()
				if(err)
					reject(err)
				else
					fulfill(rows[0].count)
			})
		}, (err) => {
			con.release()
			reject(err)	
		})
	})
}

var getBandsInfluential = () => {
	var query = `select count(b2b.urlOfBand) as inf, b.name, b.partialUrl FROM bands b inner join bands2bands b2b on b.partialUrl = b2b.urlOfRelated group by b2b.urlOfRelated order by inf desc limit 21`;
	var bands = []
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query(query, (err, rows) => {
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
		}, (err) => {
			con.release()
			reject(err)	
		})
	})
}

var searchAlbums = (req) => {
	var query = "select a.name as name, a.imageUrl as imageUrl, a.year as year, a.rating as rating, b.name as bandname, b.partialUrl as bandurl from albums a inner join bands b on b.partialUrl = a.band where a.rating between "
		+ req.ratingLower + " and " + req.ratingHigher + " and "
		+ "(a.year between " + req.yearLower + " and " + req.yearHigher
		+ (req.includeUnknown ? " or a.year = 0" : "") + ") " 
		+ (!req.name ? "" : "and ( instr(lower(a.name), lower('" + filterForSql(req.name) + "')) or instr(lower(b.name), lower('" + filterForSql(req.name) + "'))) ") 
		+ "order by " + getSortByAsString(req.sortBy, "a", "b") + (req.sortOrderAsc ? " asc " : " desc ") 
		+ "limit " + (req.page * req.numberOfResults) + "," + req.numberOfResults + ";";

	var albums = []
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query(query, (err, rows) => {
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
		}, (err) => {
			reject(err)	
		})
	})
}

var searchAlbumsCount = (req) => {
	var query = "select count(*) as count from albums a inner join bands b on b.partialUrl = a.band where a.rating between "
		+ req.ratingLower + " and " + req.ratingHigher + " and "
		+ "(a.year between " + req.yearLower + " and " + req.yearHigher
		+ (req.includeUnknown ? " or a.year = 0" : "") + ") " 
		+ (!req.name ? "" : "and ( instr(lower(a.name), lower('" + filterForSql(req.name) + "')) or instr(lower(b.name), lower('" + filterForSql(req.name) + "'))) ") + ";";
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.release()
			con.query(query, (err, rows) => {
				if(err)
					reject(err)
				else
					fulfill(rows[0].count)
			})
		}, (err) => {
			con.release()
			reject(err)	
		})
	})

}

var searchBands = (req, callback) => {
	var query = "select b.partialUrl as partialUrl, b.name as name, b.imageUrl as imageUrl from bands b where "
				+ "instr(lower(b.name), lower('" + filterForSql(req.name) + "')) " 
				+ " order by b.name "
				+ "limit " + (req.page * req.numberOfResults) + "," + req.numberOfResults + ";";

	var bands = []
	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.query(query, (err, rows) => {
				con.release()
				if(err)
					reject(err)
				for( i = 0; i < rows.length; i++ ){
					var band = parseBandFromRow(rows[i])
					bands.push(band)
				}
				fulfill(bands)
			})
		}, (err) => {
			con.release()
			reject(err)	
		})
	})
}

var searchBandsCount = (req, callback) => {
	var query = "select count(*) as count from bands b where "
				+ "instr(lower(b.name), lower('" + filterForSql(req.name) + "')) " + ";";

	return new Promise((fulfill, reject) => {
		getConnection().then((con) => {
			con.release()
			con.query(query, (err, rows) => {
				if(err)
					reject(err)
				else
					fulfill(rows[0].count)
			})
		}, (err) => {
			con.release()
			reject(err)	
		})
	})

}

module.exports = {
	resetDatabase: resetDatabase,
	updateDatabase: updateDatabase,
	updateEmptyBandPhotos: updateEmptyBandPhotos,
	getBand: getBand,
	getRatingDistribution: getRatingDistribution,
	getBandCount: getBandCount,
	getBandsInfluential: getBandsInfluential,
	searchAlbums: searchAlbums,
	searchAlbumsCount: searchAlbumsCount,
	searchBands: searchBands,
	searchBandsCount: searchBandsCount
}