const express = require('express');
const server = express();
const scaruffiDB = require('./app/scaruffiDB.js');
const scraper = require('./app/scaruffiScraper.js');
const bodyParser = require('body-parser');
const path = require('path');

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8001;
var ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

server.use(bodyParser.json());

server.get('/MusicService/band/:volume/:url', (req, res) => {
	var volume = req.params.volume;
	var url = req.params.url;
	var partialUrl = `${volume}/${url}.html`;

	scaruffiDB.getBand(partialUrl).then(res.json, () => {
		res.status(404);
		res.send('Whoopsie');
	});
});

server.get('/MusicService/ratings/distribution', (req, res) => {
	scaruffiDB.getRatingDistribution()
		.then(res.json, console.log);
});

server.get('/MusicService/bands/total', (req, res) => {
	scaruffiDB.getBandCount()
		.then(res.json, console.log);
});

server.get('/MusicService/bands/influential', (req, res) => {
	scaruffiDB.getBandsInfluential()
		.then(res.json, console.log);
});

server.post('/MusicService/albums/search', (req, res) => {
	var albumSearchRequest = req.body;
	scaruffiDB.searchAlbums(albumSearchRequest)
		.then(res.json, console.log);
});

server.post('/MusicService/albums/searchCount', (req, res) => {
	var albumSearchRequest = req.body;
	scaruffiDB.searchAlbumsCount(albumSearchRequest)
		.then(res.json, console.log);
});

server.post('/MusicService/bands/search', (req, res) => {
	var bandSearchRequest = req.body;
	scaruffiDB.searchBands(bandSearchRequest)
		.then(res.json, console.log);
});

server.post('/MusicService/bands/searchCount', (req, res) => {
	var bandSearchRequest = req.body;
	scaruffiDB.searchBandsCount(bandSearchRequest)
		.then(res.json, console.log);
});

server.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '/Scaruffi2.0/index.html'));
});

server.get('/:page', (req, res) => {
	res.sendFile(path.join(__dirname, '/Scaruffi2.0', req.params.page));
});

server.get('/:folder/:filename', (req, res) => {
	res.sendFile(path.join(__dirname, '/Scaruffi2.0', req.params.folder, req.params.filename));
});

server.listen(port, ip, () => {
	console.log("Listening on " + ip + ", port " + port);
});

//scraper.test()
//scaruffiDB.updateDatabase()
//scaruffiDB.resetDatabase()
//scaruffiDB.updateEmptyBandPhotos()