# Updater

This here is responsible for keeping the database updated. It will periodically query [`scaruffi.com`](https://scaruffi.com) to detect new ratings and bios.

It will also augment retrieved data with album art and release years from [MusicBrainz](https://musicbrainz.com), [Cover Art Archive](https://coverartarchive.org), [Deezer](https://deezer.com), [Spotify](https://spotify.com) and [Last.fm](https://last.fm).

Running from scratch usually takes around 10-ish hours. The components respects rate limits for external APIs and will limit request to `scaruffi.com` to 5 requests per second. As far as I can tell there are between 9000-10000 artists and around 21000-22000 album ratings.

It maintains in the database an `updateHistory` table that contains hashes for each page visited so it can detect changes in that page.

It also exposes an API that allows the manual correction of release year and cover art for albums and name and images for artists as well as endpoints that can start or stop updates or clear the database.

You can set the `RECHECK_DELAY` env var to control how often in seconds the server should check for changes.
