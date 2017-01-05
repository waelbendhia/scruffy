const express = require('express')
const server = express()
const scaruffiDB = require('./app/scaruffiDB.js')
const bodyParser = require('body-parser');
const path = require('path')

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8001
var ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'

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
	var callBack = function(band){
		res.json(band)
	}
	scaruffiDB.getBand(partialUrl, callBack)
})

server.get('/MusicService/ratings/distribution', (req, res) =>{
	var callback = function(distribution){
		res.json(distribution)
	}
	scaruffiDB.getRatingDistribution(callback)
})

server.get('/MusicService/bands/total', (req, res) => {
	var callback = function(total){
		res.json(total)
	}
	scaruffiDB.getBandCount(callback)
})

server.get('/MusicService/bands/influential', (req, res) => {
	var callback = function(bands){
		res.json(bands)
	}
	scaruffiDB.getBandsInfluential(callback)
})

server.post('/MusicService/albums/search', (req, res) =>{
	var albumSearchRequest = req.body
	var callback = function(albums){
		res.json(albums)
	}
	scaruffiDB.searchAlbums(albumSearchRequest, callback)
})

server.post('/MusicService/albums/searchCount', (req, res) =>{
	var albumSearchRequest = req.body
	var callback = function(count){
		res.json(count)
	}
	scaruffiDB.searchAlbumsCount(albumSearchRequest, callback)
})

server.post('/MusicService/bands/search', (req, res) =>{
	var bandSearchRequest = req.body
	var callback = function(bands){
		res.json(bands)
	}
	scaruffiDB.searchBands(bandSearchRequest, callback)
})

server.post('/MusicService/bands/searchCount', (req, res) =>{
	var bandSearchRequest = req.body
	var callback = function(count){
		res.json(count)
	}
	scaruffiDB.searchBandsCount(bandSearchRequest, callback)
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
  console.log( "Listening on " + ip + ", port " + port )
});