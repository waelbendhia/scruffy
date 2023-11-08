import { API, ArtistSearchRequest } from "@scruffy/server";
import axios from "axios";

const baseURL = `http://${process.env.SERVER_HOST ?? "localhost"}:${
  process.env.SERVER_PORT ?? 8001
}`;

const client = axios.create({
  baseURL,
});

export const searchArtists = (req: ArtistSearchRequest) =>
  client
    .get<API["/artist"]["/"]>(`/artist`, { params: req })
    .then((resp) => resp.data);
