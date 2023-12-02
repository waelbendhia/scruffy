import { prisma } from "@scruffy/database";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import { IncomingMessage, Server, ServerResponse } from "http";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Static, Type } from "@sinclair/typebox";
import { StatusUpdater, UpdateInfo } from "../update-status";
import { startUpdate, stopUpdate } from "../start-stop-signal";
import FastifySSEPlugin from "fastify-sse-v2";
import {
  AlbumProvider as AlbumProviderTag,
  ArtistProvider as ArtistProviderTag,
  albumProviders,
  artistProviders,
  hasAlbumProvider,
  hasArtistProvider,
} from "../env";
import {
  AlbumResult,
  ArtistResult,
  DeezerProvider,
  LastFMProvider,
  MusicBrainzProvider,
  SpotifyProvider,
} from "../providers";
import { Value } from "@sinclair/typebox/value";

const TArtistProviders = Type.Record(ArtistProviderTag, Type.Boolean());
export type ArtistProviders = Static<typeof TArtistProviders>;

const TAlbumProviders = Type.Record(AlbumProviderTag, Type.Boolean());
export type AlbumProviders = Static<typeof TAlbumProviders>;

export const createAPI = (
  statusUpdater: StatusUpdater,
  lastfm?: LastFMProvider,
  spotify?: SpotifyProvider,
  deezer?: DeezerProvider,
  musicbrainz?: MusicBrainzProvider,
) => {
  const api = Fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();
  api.register(FastifySSEPlugin);
  api.decorate;
  const providers = { lastfm, spotify, deezer, musicbrainz };

  type ArtistRoute = {
    Params: {
      name: string;
    };
    Reply: {
      200: ArtistResult[];
      404: { message: string; error: string };
      500: { message: string; error: string };
    };
  };

  const getArtistHandler =
    (providerTag: ArtistProviderTag) =>
    async (
      req: FastifyRequest<ArtistRoute>,
      reply: FastifyReply<Server, IncomingMessage, ServerResponse, ArtistRoute>,
    ) => {
      if (!hasArtistProvider(providerTag)) {
        reply.code(404).send({
          message: `Artist provider '${providerTag}' is disabled.`,
          error: "Not Found",
        });
        return;
      }

      const provider = providers[providerTag];
      if (!provider) {
        reply.code(500).send({
          message: `Artist provider '${providerTag}' is disabled but no provider found.`,
          error: "Internal Error",
        });
        return;
      }

      const { name } = req.params;
      const artist = await provider.searchArtist(name);
      reply.code(200).send(artist);
    };

  type AlbumRoute = {
    Params: {
      artist: string;
      album: string;
    };
    Reply: {
      200: AlbumResult[];
      404: { message: string; error: string };
      500: { message: string; error: string };
    };
  };

  const getAlbumHandler =
    (providerTag: AlbumProviderTag) =>
    async (
      req: FastifyRequest<AlbumRoute>,
      reply: FastifyReply<Server, IncomingMessage, ServerResponse, AlbumRoute>,
    ) => {
      if (!hasAlbumProvider(providerTag)) {
        reply.code(404).send({
          message: `Album provider '${providerTag}' is disabled.`,
          error: "Not Found",
        });
        return;
      }

      const { artist, album: albumName } = req.params;

      const provider = providers[providerTag];
      if (!provider) {
        reply.code(500).send({
          message: `Album provider '${providerTag}' is disabled but no provider found.`,
          error: "Internal Error",
        });
        return;
      }
      const albums = await provider.searchAlbums(artist, albumName);
      reply.code(200).send(albums);
    };

  api.get<AlbumRoute>(
    "/lastfm/artist/:artist/album/:album",
    getAlbumHandler("lastfm"),
  );

  api.get<ArtistRoute>("/deezer/artist/:name", getArtistHandler("deezer"));

  api.get<AlbumRoute>(
    "/deezer/artist/:artist/album/:album",
    getAlbumHandler("deezer"),
  );

  api.get<ArtistRoute>("/spotify/artist/:name", getArtistHandler("spotify"));

  api.get<AlbumRoute>(
    "/spotify/artist/:artist/album/:album",
    getAlbumHandler("spotify"),
  );

  api.get<AlbumRoute>(
    "/musicbrainz/artist/:artist/album/:album",
    getAlbumHandler("musicbrainz"),
  );

  api.get(
    "/providers/artist",
    { schema: { response: { 200: TArtistProviders } } },
    (_, reply) => {
      const providers = ArtistProviderTag.anyOf.reduce<ArtistProviders>(
        (p, v) => ({ ...p, [v.const]: hasArtistProvider(v.const) }),
        TArtistProviders.static,
      );

      reply.code(200).send(providers);
    },
  );

  api.put(
    "/providers/artist",
    { schema: { body: TArtistProviders, response: { 204: Type.Never() } } },
    async (req, reply) => {
      for (const { const: p } of ArtistProviderTag.anyOf) {
        if (req.body[p]) {
          artistProviders.add(p);
        } else {
          artistProviders.delete(p);
        }
      }

      reply.code(204);
    },
  );

  api.get(
    "/providers/album",
    { schema: { response: { 200: TAlbumProviders } } },
    (_, reply) => {
      const providers = AlbumProviderTag.anyOf.reduce<AlbumProviders>(
        (p, v) => ({ ...p, [v.const]: hasAlbumProvider(v.const) }),
        TAlbumProviders.const,
      );

      reply.code(200).send(providers);
    },
  );

  api.put(
    "/providers/album",
    { schema: { body: TAlbumProviders, response: { 204: Type.Never() } } },
    async (req, reply) => {
      for (const { const: p } of AlbumProviderTag.anyOf) {
        if (req.body[p]) {
          albumProviders.add(p);
        } else {
          albumProviders.delete(p);
        }
      }

      reply.code(204);
    },
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
        response: { 204: Type.Never() },
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
        response: { 204: Type.Never() },
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

  api.get(
    "/update/status",
    { schema: { response: { 200: UpdateInfo } } },
    ({}, reply) => {
      reply
        .code(200)
        .send(Value.Encode(UpdateInfo, statusUpdater.getUpdateStatus()));
    },
  );

  api.put(
    "/update/stop",
    { schema: { response: { 200: UpdateInfo } } },
    ({}, reply) => {
      if (statusUpdater.getUpdateStatus().isUpdating) {
        stopUpdate();
      }

      reply
        .code(200)
        .send(Value.Encode(UpdateInfo, statusUpdater.getUpdateStatus()));
    },
  );

  api.put(
    "/update/start",
    { schema: { response: { 200: UpdateInfo } } },
    ({}, reply) => {
      if (!statusUpdater.getUpdateStatus().isUpdating) {
        startUpdate();
      }

      reply
        .code(200)
        .send(Value.Encode(UpdateInfo, statusUpdater.getUpdateStatus()));
    },
  );

  api.delete(
    "/all-data",
    { schema: { response: { 204: Type.Never() } } },
    async (_, reply) => {
      await prisma.$transaction(async (tx) => {
        await tx.album.deleteMany({ where: {} });
        await tx.artist.deleteMany({ where: {} });
        await tx.updateHistory.deleteMany({ where: {} });
      });
      reply.code(204);
    },
  );

  api.get("/update/live", {}, (req, reply) => {
    reply.sse({
      data: JSON.stringify(
        Value.Encode(UpdateInfo, statusUpdater.getUpdateStatus()),
      ),
    });
    const sub = statusUpdater
      .watchUpdates()
      .subscribe((u) => reply.sse({ data: JSON.stringify(u) }));
    req.socket.on("close", () => {
      sub.unsubscribe();
    });
    req.socket.on("error", () => {
      sub.unsubscribe();
    });
  });

  return api;
};
