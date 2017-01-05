const express = require('express')
const app = express()
const scaruffiDB = require('./app/scaruffiDB.js')
const bodyParser = require('body-parser');
const path = require('path')

//UEFIsecure

app.use(bodyParser.json())

app.get('/MusicService/band/:volume/:url', (req, res) => {
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

app.get('/MusicService/ratings/distribution', (req, res) =>{
	var callback = function(distribution){
		res.json(distribution)
	}
	scaruffiDB.getRatingDistribution(callback)
})

app.get('/MusicService/bands/total', (req, res) => {
	var callback = function(total){
		res.json(total)
	}
	scaruffiDB.getBandCount(callback)
})

app.get('/MusicService/bands/influential', (req, res) => {
	var callback = function(bands){
		res.json(bands)
	}
	scaruffiDB.getBandsInfluential(callback)
})

app.post('/MusicService/albums/search', (req, res) =>{
	var albumSearchRequest = req.body
	var callback = function(albums){
		res.json(albums)
	}
	scaruffiDB.searchAlbums(albumSearchRequest, callback)
})

app.post('/MusicService/albums/searchCount', (req, res) =>{
	var albumSearchRequest = req.body
	var callback = function(count){
		res.json(count)
	}
	scaruffiDB.searchAlbumsCount(albumSearchRequest, callback)
})

app.post('/MusicService/bands/search', (req, res) =>{
	var bandSearchRequest = req.body
	var callback = function(bands){
		res.json(bands)
	}
	scaruffiDB.searchBands(bandSearchRequest, callback)
})

app.post('/MusicService/bands/searchCount', (req, res) =>{
	var bandSearchRequest = req.body
	var callback = function(count){
		res.json(count)
	}
	scaruffiDB.searchBandsCount(bandSearchRequest, callback)
})

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '/Scaruffi2.0/index.html'));
})

app.get('/:page', (req, res) =>{
	res.sendFile(path.join(__dirname, '/Scaruffi2.0', req.params.page));
})

app.get('/:folder/:filename', (req, res) => {
	res.sendFile(path.join(__dirname, '/Scaruffi2.0', req.params.folder, req.params.filename ))
})

app.listen(8001)