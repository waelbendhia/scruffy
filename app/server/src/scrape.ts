import { resetDatabase } from "./app";
import http from "http";

const httpPool = new http.Agent({ maxSockets: 10, keepAlive: true });

(async () => {
  console.log("Reseting database");

  await resetDatabase(5000, httpPool);

  httpPool.destroy();
})();
