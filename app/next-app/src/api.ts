import { API, AlbumSearchRequest, ArtistSearchRequest } from "@scruffy/api";
import axios from "axios";

export const baseURL = `http://${process.env.API_HOST ?? "localhost"}:${
  process.env.API_PORT ?? 8001
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

export const updaterBaseURL = `http://${
  process.env.UPDATER_HOST ?? "localhost"
}:${process.env.UPDATER_PORT ?? 8002}`;

export const updaterClient = axios.create({ baseURL: updaterBaseURL });


