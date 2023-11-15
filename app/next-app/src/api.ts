import { API, AlbumSearchRequest, ArtistSearchRequest } from "@scruffy/server";
import axios from "axios";

export const baseURL = `http://${process.env.SERVER_HOST ?? "localhost"}:${
  process.env.SERVER_PORT ?? 8001
}`;

export const client = axios.create({
  baseURL,
});

export const searchArtists = (req: ArtistSearchRequest) =>
  axios
    .get<API["/artist"]["/"]>(`/artists/search`, { params: req })
    .then((resp) => resp.data);

export const searchAlbums = (req: AlbumSearchRequest) =>
  axios
    .get<API["/album"]["/"]>(`/albums/search`, { params: req })
    .then((resp) => resp.data);
