import { client } from "@/api";
import { API } from "@scruffy/server";

export async function getData() {
  return await client
    .get<API["/artist"]["/"]>(`/artist`, { params: {} })
    .then((resp) => resp.data);
}

export default async function Artists() {
  const data = await getData();
  return (
    <main>
      artists
      {data.data.map((a) => a.name)}
    </main>
  );
}
