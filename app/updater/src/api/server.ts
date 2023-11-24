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

export const api = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

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
  async function (req, reply) {
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
  name: Type.String(),
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
  async function (req, reply) {
    const { vol, path, name } = req.params;
    const artistUrl = `${vol}/${path}.html`;
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
