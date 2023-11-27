# Scruffy2.0

This repository contains the code for [Scruffy2.0](https://scruffy.cvazn.tn).  The application is composed of three componens all in the `app/` directory.

 - [updater](./app/next-app/README.md) is responsible for keeping the database updated.
 - [api](./app/api/README.md) is a server for querying the database.
 - [next-app](./app/next-app/README.md) is a [Next.JS](https://nextjs.org/) application that queries.

There are also two packages in the `packages/` directory:

 - [database](./packages/database/README.md) a library that exposes a prisma client for querying the database.
 - [scraper](./packages/scraper/README.md) a library that exposes functions for scraping data from [scaruffi.com](https://scaruffi.com)

There are also Dockerfiles for each of the components.

# Building

You can use lerna or yarn to build, though I recommend you just use the provided Dockerfiles.

# Running

The project requires a [SQLite](https://www.sqlite.org/index.html) database, you can use prisma to run the migrations. You can also can configure the application to use [Redis](https://redis.io/) for caching though it is not required. The application reads the following variables from the environment:

 - `ADMIN_PASSWORD` a password for the administration functionality of the application. This must be a a bcrypt hash of the desired password.
 - `LAST_FM_API_KEY` though not strictly necessary this is an API key used to query the Last.fm API.
 - `DATABASE_URL` path to the SQLite database file. This should start with `file:`, see [Prisma SQLite connector](https://www.prisma.io/docs/concepts/database-connectors/sqlite).
 - `API_HOST` hostname [`api`](./app/api/README.md) will listen on, defaults to `0.0.0.0`
 - `API_PORT` port [`api`](./app/api/README.md) will listen on, defaults to `8001`
 - `UPDATER_HOST` hostname [`updater`](./app/updater/README.md) will listen on, defaults to `0.0.0.0`
 - `UPDATER_PORT` port [`updater`](./app/updater/README.md) will listen on, defaults to `8002`
 - `REDIS_URL` url of a Redis instance if you choose to use one.
 - `PORT` port the [next-app](./app/updater/README.md) will listen on, defaults to `3000`

# TODO

 - [ ] Maybe translate Bios that for artists that do not have one in English
 - [ ] Improve the resolution of Artist name and Album name when querying images and release dates from external APIs.
 - [ ] Responsive UI.
 - [ ] Improved error reporting in `updater`
 - [ ] Improved error handling in `next-app`
 - [ ] Maybe import genre tags from external sources to allow searching for albums by genre.


