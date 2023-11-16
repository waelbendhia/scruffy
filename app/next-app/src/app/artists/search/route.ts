import { API } from "@scruffy/server";
import { baseURL } from "@/api";

export async function GET(request: Request) {
  const url = new URL(`${baseURL}/artist`);
  const queryString = new URL(request.url).search;
  const params = new URLSearchParams(queryString);
  for (const [key, value] of params.entries()) {
    if (value === undefined) {
      return;
    }
    url.searchParams.set(key, typeof value === "number" ? `${value}` : value);
  }
  const resp = await fetch(url, { next: { revalidate: 300 } });
  const data: API["/artist"]["/"] = await resp.json();

  return Response.json(data);
}
