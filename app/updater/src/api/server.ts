import { prisma } from "@scruffy/database";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import {
  LastFMAlbum,
  LastFMArtist,
  getLastFMAlbum,
  getLastFMArtist,
} from "../lastfm";
import {
  DeezerAlbumSearchResult,
  DeezerArtistSearchResult,
  searchDeezerAlbums,
  searchDeezerArtists,
} from "../deezer";
import { IncomingMessage, Server, ServerResponse } from "http";
import {
  SpotifyAlbumSearchResult,
  SpotifyArtistSearchResult,
  searchSpotifyArtist,
  searchSpotifyAlbums,
} from "../spotify";
import { KeysOf, UndefinedToUnknown } from "fastify/types/type-provider";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Static, Type } from "@sinclair/typebox";
import {
  MusicBrainzReleaseSearchResult,
  searchMusicBrainzAlbums,
} from "../musicbrainz";
import { getUpdateStatus, watchUpdates } from "../update-status";
import { startUpdate, stopUpdate } from "../start-stop-signal";
import FastifySSEPlugin from "fastify-sse-v2";

export const api = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();
api.register(FastifySSEPlugin);

type ArtistRoute<T> = {
  Params: {
    name: string;
  };
  Reply: {
    200: T;
    404: null;
  };
};

const getArtistHandler =
  <T, Resp extends UndefinedToUnknown<KeysOf<T> extends never ? never : T>>(
    getter: (_: string) => Promise<Resp | null>,
  ) =>
  async (
    req: FastifyRequest<ArtistRoute<T>>,
    reply: FastifyReply<
      Server,
      IncomingMessage,
      ServerResponse,
      ArtistRoute<T>
    >,
  ) => {
    const { name } = req.params;
    const artist = await getter(name);
    if (!artist) {
      reply.code(404).send(artist);
    } else {
      reply.code(200).send(artist);
    }
  };

type AlbumRoute<T> = {
  Params: {
    artist: string;
    album: string;
  };
  Reply: {
    200: T;
    404: null;
  };
};

const getAlbumHandler =
  <T, Resp extends UndefinedToUnknown<KeysOf<T> extends never ? never : T>>(
    getter: (artist: string, album: string) => Promise<Resp | null>,
  ) =>
  async (
    req: FastifyRequest<AlbumRoute<T | null>>,
    reply: FastifyReply<Server, IncomingMessage, ServerResponse, AlbumRoute<T>>,
  ) => {
    const { artist, album: albumName } = req.params;
    const album = await getter(artist, albumName);
    if (!album) {
      reply.code(404).send(album);
    } else {
      // @ts-ignore
      reply.code(200).send(album);
    }
  };

api.get<ArtistRoute<LastFMArtist>>(
  "/lastfm/artist/:name",
  getArtistHandler(getLastFMArtist),
);

api.get<AlbumRoute<LastFMAlbum>>(
  "/lastfm/artist/:artist/album/:album",
  getAlbumHandler(getLastFMAlbum),
);

api.get<ArtistRoute<DeezerArtistSearchResult>>(
  "/deezer/artist/:name",
  getArtistHandler(searchDeezerArtists),
);

api.get<AlbumRoute<DeezerAlbumSearchResult>>(
  "/deezer/artist/:artist/album/:album",
  getAlbumHandler(searchDeezerAlbums),
);

api.get<ArtistRoute<SpotifyArtistSearchResult>>(
  "/spotify/artist/:name",
  getArtistHandler(searchSpotifyArtist),
);

api.get<AlbumRoute<SpotifyAlbumSearchResult>>(
  "/spotify/artist/:artist/album/:album",
  getAlbumHandler(searchSpotifyAlbums),
);

api.get<AlbumRoute<MusicBrainzReleaseSearchResult>>(
  "/musicbrainz/artist/:artist/album/:album",
  getAlbumHandler(searchMusicBrainzAlbums),
);

const TUpdateArtist = Type.Object({
  name: Type.Optional(Type.String()),
  imageUrl: Type.Optional(Type.String()),
});

type UpdateArtist = Static<typeof TUpdateArtist>;

api.put<{
  Body: UpdateArtist;
  Reply: null;
  Params: { vol: string; path: string };
}>(
  "/artist/:vol/:path",
  {
    schema: {
      body: TUpdateArtist,
      response: { 204: Type.Null() },
    },
  },
  async (req, reply) => {
    const { vol, path } = req.params;
    const artistURL = `/${vol}/${path}.html`;
    console.log("updating", artistURL);
    const update = req.body;

    await prisma.artist.update({
      where: { url: artistURL },
      data: {
        imageUrl: update.imageUrl,
        name: update.name,
        lastModified: new Date(),
      },
    });

    reply.code(204);
  },
);

const TUpdateAlbum = Type.Object({
  name: Type.Optional(Type.String()),
  year: Type.Optional(Type.Number()),
  imageUrl: Type.Optional(Type.String()),
});

type UpdateAlbum = Static<typeof TUpdateAlbum>;

api.put<{
  Body: UpdateAlbum;
  Reply: null;
  Params: { vol: string; path: string; name: string };
}>(
  "/artist/:vol/:path/album/:name",
  {
    schema: {
      body: TUpdateAlbum,
      response: { 204: Type.Null() },
    },
  },
  async (req, reply) => {
    const { vol, path, name: encodedName } = req.params;
    const name = decodeURIComponent(encodedName);
    const artistUrl = `/${vol}/${path}.html`;
    const update = req.body;

    await prisma.album.update({
      where: { artistUrl_name: { artistUrl, name } },
      data: {
        imageUrl: update.imageUrl,
        name: update.name,
        year: update.year,
      },
    });

    reply.code(204);
  },
);

type UpdateStatus = ReturnType<typeof getUpdateStatus>;

api.get<{ Reply: { 200: UpdateStatus } }>("/update/status", (_, reply) => {
  reply.code(200).send(getUpdateStatus());
});

api.put<{ Reply: { 200: UpdateStatus } }>("/update/stop", (_, reply) => {
  if (getUpdateStatus().isUpdating) {
    stopUpdate();
  }

  reply.code(200).send(getUpdateStatus());
});

api.put<{ Reply: { 200: UpdateStatus } }>("/update/start", (_, reply) => {
  if (!getUpdateStatus().isUpdating) {
    startUpdate();
  }

  reply.code(200).send(getUpdateStatus());
});

api.delete<{ Reply: { 204: null } }>("/all-data", async (_, reply) => {
  await prisma.$transaction(async (tx) => {
    await tx.album.deleteMany({ where: {} });
    await tx.artist.deleteMany({ where: {} });
    await tx.updateHistory.deleteMany({ where: {} });
  });
  reply.code(204);
});

api.get("/update/live", {}, (req, reply) => {
  reply.sse({ data: JSON.stringify(getUpdateStatus()) });
  const sub = watchUpdates().subscribe((u) =>
    reply.sse({ data: JSON.stringify(u) }),
  );
  req.socket.on("close", () => {
    sub.unsubscribe();
  });
});
