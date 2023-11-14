import axios, { AxiosRequestConfig } from "axios";
import * as crypto from "crypto";

const basePath = "http://scaruffi.com";

export const scruffyPath = (pathname: string) =>
  new URL(pathname, basePath).href;

export const getPage = async (
  pagePath: string,
  config?: AxiosRequestConfig,
) => {
  const resp = await axios.get<string>(scruffyPath(pagePath), {
    ...config,
    responseType: "document",
  });

  return {
    url: pagePath,
    lastModified: new Date(resp.headers["last-modified"] as string),
    data: resp.data,
    hash: crypto.createHash("md5").update(resp.data).digest("hex"),
  };
};
