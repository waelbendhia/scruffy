import axios, { AxiosInstance } from "axios";
import * as crypto from "crypto";

const defaultClient = axios.create();

const basePath = "https://scaruffi.com";

export const scruffyPath = (pathname: string) =>
  new URL(pathname, basePath).href;

export const getPage = async (pagePath: string, client?: AxiosInstance) => {
  const resp = await (client ?? defaultClient).get<string>(
    scruffyPath(pagePath),
    {
      responseType: "document",
    },
  );

  return {
    url: pagePath,
    lastModified: new Date(resp.headers["last-modified"] as string),
    data: resp.data,
    hash: crypto.createHash("md5").update(resp.data).digest("hex"),
  };
};
