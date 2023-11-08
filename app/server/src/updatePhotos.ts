import * as Album from "./app/album";
import * as Band from "./app/band";
import http from "http";

const httpPool = new http.Agent({
  maxSockets: 10,
  keepAlive: true,
});

(async () => {
  await Promise.all([
    Band.updateEmptyPhotos(5000, httpPool),
    Album.updateEmptyPhotos(5000, httpPool),
  ]);

  httpPool.destroy();
})();
