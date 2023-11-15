import { baseURL } from "@/api";
import { API, AlbumSearchRequest } from "@scruffy/server";
import { RedirectType, redirect } from "next/navigation";
import SearchLayout from "@/components/SearchLayout";
import AlbumCard from "@/components/AlbumCard";
import SortSelect from "@/components/SortSelect";

const getData = async (params: Omit<AlbumSearchRequest, "itemsPerPage">) => {
  const url = new URL(`${baseURL}/album`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      return;
    }
    url.searchParams.set(key, typeof value === "number" ? `${value}` : value);
  });
  url.searchParams.set("itemsPerPage", "12");
  const resp = await fetch(url);
  const { data, total }: API["/album"]["/"] = await resp.json();

  const maxPage = Math.max(Math.ceil(total / 12) - 1, 0);
  if ((params.page ?? 0) > maxPage) {
    const redirectParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      redirectParams.set(key, typeof val === "number" ? `${val}` : val);
    });
    redirectParams.set("page", `${maxPage}`);
    return redirect(`/albums?${redirectParams}`, RedirectType.replace);
  }

  return { data, total, params };
};

const parseIntMaybe = (s: string | undefined): number | undefined => {
  const parsed = parseInt(s ?? "");
  return isNaN(parsed) ? undefined : parsed;
};

type Props = {
  searchParams: Record<string, string>;
};

type SortColumn = Exclude<AlbumSearchRequest["sort"], undefined>;

const asSortColumn = (x: unknown): SortColumn =>
  x === "rating" || x === "name" || x === "artist" ? x : "year";

const labels: Record<SortColumn, string> = {
  rating: "Rating",
  name: "Name",
  artist: "Artist",
  year: "Newest",
  lastUpdated: "Last Updated",
};

export default async function Artists({ searchParams }: Props) {
  const page = Math.max(parseIntMaybe(searchParams.page) ?? 0, 0);
  const sort = asSortColumn(searchParams.sort);
  const { data, total } = await getData({
    page,
    sort,
    name: searchParams.name,
  });

  return (
    <main className={`flex-1 px-4 min-h-fullscreen`}>
      <SearchLayout
        searchName={searchParams.name}
        data={data}
        total={total}
        page={page ?? 0}
        renderRow={(a) => (
          <AlbumCard
            key={`${a.artist.url}-${a.name}`}
            className="h-48"
            {...a}
          />
        )}
        filters={
          <SortSelect
            labels={labels}
            searchParams={searchParams}
            coerceString={asSortColumn}
          />
        }
      />
    </main>
  );
}
