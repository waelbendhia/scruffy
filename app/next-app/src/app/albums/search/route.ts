import { API } from "@scruffy/server";
import { client } from "@/api";

export async function GET(request: Request) {
  const queryString = new URL(request.url).search
  const params = new URLSearchParams(queryString);
  const resp = await client.get<API["/album"]["/"]>(`/album`, { params });
  return Response.json(resp.data);
}
