const request = require('request');
const jsdom = require('jsdom')

module.exports.test = function() {
	jsdom.env(
		"http://scaruffi.com/cdreview/index.html",
		[],
		function (err, window) {
			console.log("JSDOM: ", window.document.body.innerHTML);
		}
	)
}