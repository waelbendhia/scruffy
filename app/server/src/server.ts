import express, { Response } from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import { router } from "./app";
import { uuidMiddleware, getUUID, errorMiddleware } from "./app/shared";

const port =
  parseInt(process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || "", 10) ||
  8001;
const ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0";

morgan.token("request-id", (_, res: Response) => getUUID(res) ?? "");

express()
  .use(uuidMiddleware)
  .use(bodyParser.json())
  .use(
    morgan((tokens, req, res) =>
      [
        tokens.method(req, res),
        tokens["request-id"](req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, "content-length"),
        "-",
        tokens["response-time"](req, res),
        "ms",
      ].join(" "),
    ),
  )
  .use("/", router)
  .use(errorMiddleware)
  .listen(port, ip, () => console.log("Listening on " + ip + ", port " + port));
