import express from "express";
import bodyParser from "body-parser";
import scaruffiDB from "./app/scaruffiDB";
const server = express();
const path = require("path");

let port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8001;
let ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0";

server.use(bodyParser.json());

server.get("/MusicService/band/:volume/:url", (req, res) => {
	scaruffiDB
		.getBand(`${req.params.volume}/${req.params.url}.html`)
		.then(data => res.json(data))
		.catch(() => res.status(404).json("Whoopsie"));
});

server.get("/MusicService/ratings/distribution", (req, res) => {
	scaruffiDB
		.getRatingDistribution()
		.then(data => res.json(data))
		.catch(console.log);
});

server.get("/MusicService/bands/total", (req, res) => {
	scaruffiDB
		.getBandCount()
		.then(data => res.json(data))
		.catch(console.log);
});

server.get("/MusicService/bands/influential", (req, res) => {
	scaruffiDB
		.getBandsInfluential()
		.then(data => res.json(data))
		.catch(console.log);
});

server.post("/MusicService/albums/search", (req, res) => {
	scaruffiDB
		.searchAlbums(req.body)
		.then(data => res.json(data))
		.catch(console.log);
});

server.post("/MusicService/albums/searchCount", (req, res) => {
	scaruffiDB
		.searchAlbumsCount(req.body)
		.then(data => res.json(data))
		.catch(console.log);
});

server.post("/MusicService/bands/search", (req, res) => {
	scaruffiDB
		.searchBands(req.body)
		.then(data => res.json(data))
		.catch(console.log);
});

server.post("/MusicService/bands/searchCount", (req, res) => {
	scaruffiDB
		.searchBandsCount(req.body)
		.then(data => res.json(data))
		.catch(console.log);
});

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
