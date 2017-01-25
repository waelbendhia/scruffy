const express = require('express')
const server = express()
const scaruffiDB = require('./app/scaruffiDB.js')
const scraper = require('./app/scaruffiScraper.js')
const bodyParser = require('body-parser');
const path = require('path')

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8001
var ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'

console.log("process.env.IP : " + process.env.IP)
console.log("process.env.PORT : " + process.env.PORT)
console.log("process.env.OPENSHIFT_NODEJS_IP : " + process.env.OPENSHIFT_NODEJS_IP)
console.log("process.env.OPENSHIFT_NODEJS_PORT : " + process.env.OPENSHIFT_NODEJS_PORT)
console.log("Server on : " + ip + " " + port)

server.use(bodyParser.json())

server.get('/MusicService/band/:volume/:url', (req, res) => {
	var volume = req.params.volume
	var url = req.params.url
	var partialUrl = `${volume}/${url}.html`
	var band = {
		name: '',
		url: `${volume}/${url}.html`,
		bio: '',
		fullurl: `http://scaruffi.com/${volume}/${url}.html`,
		albums: [],
		relatedBand: []
	}

	scaruffiDB.getBand(partialUrl).then(function(band){
		res.json(band)
	},function(err){
		console.log(err)
	})
})

server.get('/MusicService/ratings/distribution', (req, res) =>{
	scaruffiDB.getRatingDistribution().then((distribution) => {
		res.json(distribution)
	}, (err) => {
		console.log(err)
	})
})

server.get('/MusicService/bands/total', (req, res) => {
	scaruffiDB.getBandCount().then((total) => {
		res.json(total)
	}, (err) => {
		console.log(err)
	})
})

server.get('/MusicService/bands/influential', (req, res) => {
	scaruffiDB.getBandsInfluential().then((bands) => {
		res.json(bands)
	}, (err) => {
		console.log(err)
	})
})

server.post('/MusicService/albums/search', (req, res) =>{
	var albumSearchRequest = req.body
	scaruffiDB.searchAlbums(albumSearchRequest).then((albums) => {
		res.json(albums)
	}, (err) => {
		console.log(err)
	})
})

server.post('/MusicService/albums/searchCount', (req, res) =>{
	var albumSearchRequest = req.body
	scaruffiDB.searchAlbumsCount(albumSearchRequest).then((count) => {
		res.json(count)
	}, (err) => {
		console.log(err)
	})
})

server.post('/MusicService/bands/search', (req, res) =>{
	var bandSearchRequest = req.body
	scaruffiDB.searchBands(bandSearchRequest).then((bands) => {
		res.json(bands)
	}, (err) => {
		console.log(err)
	})
})

server.post('/MusicService/bands/searchCount', (req, res) =>{
	var bandSearchRequest = req.body
	scaruffiDB.searchBandsCount(bandSearchRequest).then((count) => {
		res.json(count)
	}, (err) => {
		console.log(err)
	})
})

server.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '/Scaruffi2.0/index.html'));
})

server.get('/:page', (req, res) =>{
	res.sendFile(path.join(__dirname, '/Scaruffi2.0', req.params.page));
})

server.get('/:folder/:filename', (req, res) => {
	res.sendFile(path.join(__dirname, '/Scaruffi2.0', req.params.folder, req.params.filename ))
})

server.listen(port, ip, function () {
	//scaruffiDB.updateDatabase()
	console.log( "Listening on " + ip + ", port " + port )
	scraper.test()
});