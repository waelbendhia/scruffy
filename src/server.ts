import express from "express";
import bodyParser from "body-parser";
import { Pool } from "pg";
import {
	getBand, getRatingDistribution, getBandCount, getBandsInfluential,
	searchAlbums, searchAlbumsCount, AlbumSearchRequest, BandSearchRequest, searchBands, searchBandsCount
} from "./app/scaruffiDB";
const server = express();
const path = require("path");

const port =
	parseInt(
		process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || ''
	) || 8001,
	ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0",
	parseAlbumSearchRequest = (b: any): AlbumSearchRequest => ({
		ratingLower: parseInt(b.ratingLower) || 0,
		ratingHigher: parseInt(b.ratingHigher) || 1,
		yearLower: parseInt(b.yearLower) || 0,
		yearHigher: parseInt(b.yearHigher) || 10000,
		includeUnknown: !!b.includeUnknown,
		sortBy: parseInt(b.sortBy) || 10000,
		sortOrderAsc: !!b.sortOrderAsc,
		...parseBandSearchRequest(b)
	}),
	parseBandSearchRequest = (b: any): BandSearchRequest => ({
		name: b.name || '',
		page: parseInt(b.page) || 0,
		numberOfResults: parseInt(b.numberOfResults) || 10
	})

server.use(bodyParser.json());

server.set(
	"con",
	new Pool({
		user: process.env.PG_USER || "wael",
		database: process.env.PG_DATABASE || "scaruffi",
		password: process.env.PG_PASSWORD || "",
		port: parseInt(process.env.PG_PORT as string) || 5432,
		host: process.env.PG_HOST || "localhost",
	})
);

function getDBCon() {
	return (server.get("con") as Pool).connect();
}

server.get(
	"/MusicService/band/:volume/:url",
	async (req, res) => {
		const con = await getDBCon(),
			band = await getBand(
				con,
				`${req.params.volume}/${req.params.url}.html`,
			);
		con.release();
		if (!!band) {
			res.json(band);
		} else {
			res.status(404).json("Whoopsie")
		}
	}
);

server.get(
	"/MusicService/ratings/distribution",
	async (req, res) => {
		const con = await getDBCon(),
			distribution = await getRatingDistribution(con);
		con.release();
		res.json(distribution);
	}
);

server.get(
	"/MusicService/bands/total",
	async (req, res) => {
		const con = await getDBCon(),
			count = await getBandCount(con);
		con.release();
		res.json(count)
	}
);

server.get(
	"/MusicService/bands/influential",
	async (req, res) => {
		const con = await getDBCon(),
			bands = await getBandsInfluential(con);
		con.release();
		res.json(bands);
	}
);

server.post(
	"/MusicService/albums/search",
	async (req, res) => {
		const con = await getDBCon(),
			albums = await searchAlbums(con, parseAlbumSearchRequest(req.body));
		res.json(albums);
	}
);

server.post(
	"/MusicService/albums/searchCount",
	async (req, res) => {
		const con = await getDBCon(),
			count = await searchAlbumsCount(con, parseAlbumSearchRequest(req.body));
		res.json(count);
	}
);

server.post(
	"/MusicService/bands/search",
	async (req, res) => {
		const con = await getDBCon(),
			bands = await searchBands(con, parseBandSearchRequest(req.body));
		res.json(bands);
	}
);

server.post(
	"/MusicService/bands/searchCount",
	async (req, res) => {
		const con = await getDBCon(),
			count = await searchBandsCount(con, parseBandSearchRequest(req.body));
		res.json(count);
	}
);

server.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "../Scaruffi2.0/index.html"));
});

server.get("/:page", (req, res) => {
	res.sendFile(path.join(__dirname, "../Scaruffi2.0", req.params.page));
});

server.get("/:folder/:filename", (req, res) => {
	res.sendFile(path.join(__dirname, "../Scaruffi2.0", req.params.folder, req.params.filename));
});

server.listen(port, ip, () => {
	console.log("Listening on " + ip + ", port " + port);
});

// scraper.test()
// scaruffiDB.resetDatabase();
// scaruffiDB.updateDatabase();
// scaruffiDB.updateEmptyBandPhotos();
