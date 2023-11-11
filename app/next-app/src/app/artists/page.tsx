import { client } from "@/api";
import ArtistSearch from "@/components/ArtistSearch";
import { API, ArtistSearchRequest } from "@scruffy/server";
import ArtistCard from "@/components/ArtistCard";

export async function getData(params: ArtistSearchRequest) {
  console.log(params);
  return await client
    .get<API["/artist"]["/"]>(`/artist`, { params })
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
  const page = parseIntMaybe(searchParams.page);
  const data = await getData({
    page: page,
    itemsPerPage: 12,
    name: searchParams.name,
  });
  const offset = (page ?? 0) * 10;

  return (
    <main className="flex-1">
      <ArtistSearch />
      <div className="max-w-screen-xl h-8 leading-8 mb-2 px-1 mx-auto">
        {data.total > 0 ? (
          <>
            Showing results <b>{offset + 1}</b> to{" "}
            <b>{offset + data.data.length}</b> of <b>{data.total}</b>{" "}
            {searchParams.name && (
              <>
                for <i>{searchParams.name}</i>
              </>
            )}
          </>
        ) : (
          <>
            No results found for <i>{searchParams.name}</i>
          </>
        )}
      </div>
      <div
        className={
          `grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 ` +
          `lg:gap-8 max-w-screen-xl mx-auto`
        }
      >
        {data.data.map((b) => (
          <ArtistCard key={b.url} className="h-48" {...b} />
        ))}
      </div>
    </main>
  );
}
