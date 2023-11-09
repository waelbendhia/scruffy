import { client } from "@/api";
import ArtistSearch from "@/components/ArtistSearch";
import { API, ArtistSearchRequest } from "@scruffy/server";

export async function getData(params: ArtistSearchRequest) {
  return await client
    .get<API["/artist"]["/"]>(`/artist`, { params: params })
    .then((resp) => resp.data);
}

const parseIntMaybe = (s: string | undefined): number | undefined => {
  const parsed = parseInt(s ?? "");
  return isNaN(parsed) ? undefined : parsed;
};

export default async function Artists({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const data = await getData({
    page: parseIntMaybe(searchParams.page),
    itemsPerPage: parseIntMaybe(searchParams.itemsPerPage),
    name: searchParams.name,
  });

  return (
    <main>
      artists
      <ArtistSearch />
      {JSON.stringify(searchParams)}
      {data.data.map((a) => a.name)}
    </main>
  );
}
