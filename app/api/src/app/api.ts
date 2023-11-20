import * as artist from "./artist";
import * as album from "./album";
import { Router, RouterType } from "./routing";

export type API = RouterType<typeof api>;

export const api = {
  domain: "scruffy",
  routes: {
    "/artist": artist.api,
    "/album": album.api,
  },
} satisfies Router<"scruffy">;
