import pg, { PoolClient, Query } from "pg";
import { Band, Album } from "./types";
import { getAllBands, getBandInfo, getBandPhotoUrl, getAlbumPhotoUrl } from "./scaruffiScraper"

interface BandRow {
	name: string,
	partialUrl: string,
	bio: string,
	imageUrl: string
}

const db_host = process.env.MYSQL_HOST || "localhost",
	db_user = process.env.MYSQL_USER || "wael",
	db_password = process.env.MYSQL_PASSWORD || "",
	db_database = process.env.MYSQL_DATABASE || "myapp_test", //"scaruffi"
	lastfm_api_key = process.env.LASTFM_API_KEY;


const SORT_BY_RATING = 0,
	SORT_BY_DATE = 1,
	SORT_BY_ALBUM_NAME = 2,
	SORT_BY_BANDNAME = 3;

const createBandsQuery =
	`CREATE TABLE bands(
			partialUrl TEXT NOT NULL PRIMARY KEY,
			name TEXT not null,
			bio TEXT,
			imageUrl TEXT
		);`,
	createAlbumsQuery =
		`CREATE TABLE albums(
			name TEXT NOT NULL
			year INTEGER,
			rating REAL,
			band TEXT NOT NULL,
			imageUrl TEXT,
			CONSTRAINT pk_albumID PRIMARY KEY (name, band),
			FOREIGN KEY (band) REFERENCES bands(partialUrl)
		);`,
	createBand2Bandquery =
		`CREATE TABLE bands2bands(
			urlOfBand TEXT NOT NULL,
			urlOfRelated TEXT NOT NULL,
			CONSTRAINT pk_b2bID PRIMARY KEY (urlOfBand, urlOfRelated),
			FOREIGN KEY (urlOfBand) REFERENCES bands(partialUrl),
			FOREIGN KEY (urlOfRelated) REFERENCES bands(partialUrl)
		);`,
	dropQuery = "DROP TABLE IF EXISTS bands2bands, albums, bands;";

const dropTables = async (con: PoolClient) => await con.query(dropQuery);


const createTables = async (con: PoolClient) =>
	await Promise.all(
		[
			createBandsQuery,
			createAlbumsQuery,
			createBand2Bandquery,
		]
			.map(query => con.query(query)),
	);


const insertOrUpdateFull = async (con: PoolClient, band: Band) => {
	if (band.name == "ERROR" || !band.name || !band.bio) {
		throw `${band.url} was not scraped successfully`;
	}

	await insertBandLazy(con, band);
	await con.query(
		"UPDATE bands SET name = $1, bio = $2 WHERE partialURl = $3",
		[band.name, band.bio, band.url]
	);

	for (let album of band.albums || []) {
		await insertAlbum(con, band, album);
	}

	for (let other of band.relatedBands || []) {
		await insertBandLazy(con, other);
		await insertBandRelation(con, band, other);
	}
}

export const updateDatabase = async (con: PoolClient) => {
	const bands = await getAllBands(),
		fullBands = await Promise.all(bands.map(getBandInfo));
	await Promise.all(fullBands.map(insertOrUpdateFull.bind(con)));
	await updateEmptyBandPhotos(con);
	await updateEmptyAlbumPhotos(con);
}

export const resetDatabase = async (con: PoolClient) => {
	await dropTables(con);
	await createTables(con);
	await updateDatabase(con);
}

export const updateEmptyBandPhotos = async (con: PoolClient) => {
	const res = await con.query(
		`SELECT * FROM bands WHERE imageUrl = '' OR imageUrl IS NULL;`
	);
	await Promise.all(
		res.rows.map(parseBandFromRow).map(b => insertBandPhotoUrl(con, b)),
	);
}

const insertBandLazy = async (con: PoolClient, band: Band) =>
	await con.query(
		"INSERT INTO bands (partialUrl, name, bio) VALUES ($1, $2, $3);",
		[band.url, band.name, band.bio],
	);


const insertBandRelation = async (con: PoolClient, band: Band, related: Band) =>
	await con.query(
		"INSERT INT bands2bands (urlOfBand, urlOfRelated) VALUES ($1, $@)",
		[band.url, related.url]
	);


const insertAlbum = async (con: PoolClient, band: Band, album: Album) =>
	await con.query(
		"INSERT INTO albums (name, year, rating, band) VALUES ($1, $2, $3, $4)",
		[album.name, album.year, album.rating, band.url]
	);

const updateEmptyAlbumPhotos = async (con: PoolClient) => {
	const res = await con.query(
		`SELECT
			a.name AS name,
			a.year AS year,
			a.rating AS rating,
			a.band AS bandUrl,
			b.name AS bandName 
		FROM albums a INNER JOIN bands b ON a.band = b.partialUrl
		WHERE a.imageUrl = '' OR a.imageUrl IS NULL;`
	),
		albums: Album[] = res.rows.map(
			r => ({
				...parseAlbumFromRow(r),
				band: {
					name: r.bandName,
					url: r.bandUrl
				}
			})
		);
	await Promise.all(albums.map(a => insertAlbumPhotoUrl(con, a)))
}

const insertBandPhotoUrl = async (con: PoolClient, band: Band) =>
	await con.query(
		"UPDATE bands SET imageUrl = $1 WHERE partialUrl = $2;",
		[await getBandPhotoUrl(band), band.url]
	);

const insertAlbumPhotoUrl = async (con: PoolClient, album: Album) =>
	await con.query(
		"UPDATE albums SET imageUrl = $1 WHERE name = $2 and band = $3",
		[
			await getAlbumPhotoUrl(album),
			album.name,
			album.band ? album.band.url : ""
		]
	);

const parseBandFromRow = (row: BandRow): Band =>
	({
		name: row.name,
		url: row.partialUrl,
		bio: row.bio,
		imageUrl: row.imageUrl,
		fullUrl: `http://scaruffi.com/${row.partialUrl}`,
		albums: [],
		relatedBands: []
	})

const parseAlbumFromRow = (row: any): Album =>
	({
		name: row.name,
		year: row.year,
		rating: row.rating,
		imageUrl: row.imageUrl
	});


const getSortByAsString =
	(
		sortBy: number,
		albumSymbol: string,
		bandSymbol: string,
	) => {
		switch (sortBy) {
			case SORT_BY_RATING:
				return albumSymbol + ".rating";
			case SORT_BY_DATE:
				return albumSymbol + ".year";
			case SORT_BY_ALBUM_NAME:
				return albumSymbol + ".name";
			case SORT_BY_BANDNAME:
				return bandSymbol + ".name";
			default:
				return "DEFAULT";
		}
	}

const getRelatedBands = async (con: PoolClient, band: Band) => {
	const res = await con.query(
		`SELECT * 
		FROM bands
			INNER JOIN bands2bands
			ON bands.partialUrl = bands2bands.urlOfRelated 
		WHERE bands2bands.urlOfBand =$1`,
		[band.url]
	);
	return res.rows.map(parseBandFromRow);
}

const getAlbums = async (con: PoolClient, band: Band) => {
	const res = await con.query(
		`SELECT * FROM albums where band =$1`,
		[band.url]
	);
	return res.rows.map(parseAlbumFromRow);
}

export const getBand = async (con: PoolClient, partialUrl: string): Promise<Band | null> => {
	const res = await con.query(
		`SELECT * FROM bands WHERE partialUrl =$1`,
		[partialUrl]
	);
	if (res.rows.length !== 1) {
		return null;
	}
	const partialBand = parseBandFromRow(res.rows[0]);
	return {
		...partialBand,
		albums: await getAlbums(con, partialBand),
		relatedBands: await getRelatedBands(con, partialBand)
	}
}

export const getRatingDistribution =
	async (con: PoolClient): Promise<{ [rating: string]: number }> => {
		const res = await con.query(
			`SELECT 
			floor(albums.rating*2)/2 as rating,
			count(*) as count
		FROM albums GROUP BY floor(albums.rating*2)/2;`
		);
		return res.rows.reduce(
			(p, { ratings, count }: { ratings: number, count: number }) => ({
				...p,
				[ratings.toFixed(1)]: count
			})
			, {}
		);
	}

export const getBandCount = async (con: PoolClient) =>
	(await con.query(`SELECT count(*) AS count FROM bands;`))
		.rows[0].count as number;


export const getBandsInfluential = async (con: PoolClient) => {
	const res = await con.query(
		`SELECT
			count(b2b.urlOfBand) as inf,
			b.name,
			b.partialUrl
		FROM bands b INNER JOIN bands2bands b2b ON b.partialUrl = b2b.urlOfRelated
		GROUP BY b2b.urlOfRelated
		ORDER BY inf DESC LIMIT 21;`
	);
	return res.rows.map(parseBandFromRow)
}

export interface AlbumSearchRequest {
	ratingLower: number,
	ratingHigher: number,
	yearLower: number,
	yearHigher: number,
	includeUnknown: boolean,
	name: string,
	sortBy: number,
	sortOrderAsc: boolean,
	page: number,
	numberOfResults: number,
}

export const searchAlbums = async (con: PoolClient, req: AlbumSearchRequest) => {
	const res = await con.query(
		`SELECT
			a.name AS name,
			a.imageUrl AS imageUrl,
			a.year AS year,
			a.rating AS rating,
			b.name AS bandname,
			b.partialUrl AS bandurl
		FROM albums a INNER JOIN bands b ON b.partialUrl = a.band
		WHERE
			a.rating BETWEEN $1 AND $2 AND
			(a.year BETWEEN $3 AND $4 OR a.year = 0 AND $5) AND
			($6 = '' OR instr(lower(a.name), lower($6)) OR instr(lower(b.name), lower($6)) )
		ORDER BY 
				CASE $7
					WHEN 'a.rating' THEN a.rating
					WHEN 'a.year'   THEN a.year
					WHEN 'a.name'   THEN a.name
					WHEN 'b.name'   THEN b.name
				END
				CASE WHEN $8
					THEN ASC
					ELSE DESC
				END
			LIMIT $9 OFFSET $10;`,
		[
			req.ratingLower,
			req.ratingHigher,
			req.yearLower,
			req.yearHigher,
			req.includeUnknown,
			req.name,
			getSortByAsString(req.sortBy, "a", "b"),
			req.sortOrderAsc,
			req.numberOfResults,
			req.page * req.numberOfResults,
		]
	)
	return res.rows.map(r => ({
		...parseAlbumFromRow(r),
		band: {
			name: r.bandname,
			url: r.bandurl,
			fullurl: `http://scaruffi.com/${r.bandurl}`
		}
	}));
}

export const searchAlbumsCount = async (con: PoolClient, req: AlbumSearchRequest) => {
	const res = await con.query(
		`SELECT
			count(*)
		FROM albums a INNER JOIN bands b ON b.partialUrl = a.band
		WHERE
			a.rating BETWEEN $1 AND $2 AND
			(a.year BETWEEN $3 AND $4 OR a.year = 0 AND $5) AND
			($6 = '' OR instr(lower(a.name), lower($6)) OR instr(lower(b.name), lower($6)));`,
		[
			req.ratingLower,
			req.ratingHigher,
			req.yearLower,
			req.yearHigher,
			req.includeUnknown,
			req.name
		]
	);
	return res.rows[0].count as number;
}

export interface BandSearchRequest {
	name: string,
	numberOfResults: number,
	page: number
}

export const searchBands = async (con: PoolClient, req: BandSearchRequest) => {
	const res = await con.query(
		`SELECT
			b.partialUrl AS partialUrl,
			b.name AS name,
			b.imageUrl AS imageUrl
		FROM bands b
		WHERE 
			instr(lower(b.name), lower($1)
		ORDER BY b.name 
		LIMIT $2 OFFSET $4;`,
		[
			req.name,
			req.numberOfResults,
			req.page * req.numberOfResults,
		]
	);
	return res.rows.map(parseBandFromRow);
}

export const searchBandsCount = async (con: PoolClient, req: BandSearchRequest) => {
	const res = await con.query(
		`SELECT count(*) as count
		FROM bands b 
		WHERE instr(lower(b.name), lower($1);`,
		[req.name]
	)
	return res.rows[0].count as number;
}