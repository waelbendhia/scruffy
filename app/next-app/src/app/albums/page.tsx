import { baseURL } from "@/api";
import { API, AlbumSearchRequest } from "@scruffy/server";
import { RedirectType, redirect } from "next/navigation";
import SearchLayout from "@/components/SearchLayout";
import AlbumCard from "@/components/AlbumCard";
import SortSelect from "@/components/SortSelect";
import { Metadata } from "next";
import Loading from "@/components/Loading";

export const metadata: Metadata = {
  title: "Search Album Reviews",
  description: "Album reviews by Piero Scaruffi",
};

const getData = async (params: Omit<AlbumSearchRequest, "itemsPerPage">) => {
  const url = new URL(`${baseURL}/album`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    url.searchParams.set(key, typeof value === "number" ? `${value}` : value);
  });
  url.searchParams.set("itemsPerPage", "12");
  const resp = await fetch(url, { next: { revalidate: 300 } });
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

type SortableColumns = Exclude<SortColumn, "artist" | "lastUpdated">;

const asSortColumn = (x: unknown): SortableColumns =>
  x === "rating" || x === "name" ? x : "year";

const asRating = (s: unknown): number =>
  s === "6" ? 6 : s === "7" ? 7 : s === "8" ? 8 : s === "9" ? 9 : 0;

const labels: Record<SortableColumns, string> = {
  rating: "Rating",
  name: "Name",
  year: "Newest",
};

export default async function Albums({ searchParams }: Props) {
  const page = Math.max(parseIntMaybe(searchParams.page) ?? 0, 0);
  const sort = asSortColumn(searchParams.sort);
  const ratingMin = asRating(searchParams.ratingMin);
  const { data, total } = await getData({
    page,
    sort,
    ratingMin,
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
          <div className="flex justify-between">
            <SortSelect
              labels={labels}
              searchParams={searchParams}
              coerceString={asSortColumn}
            />
            <SortSelect<number>
              label={"Min Rating:"}
              labels={{
                0: "Any",
                6: "6",
                7: "7",
                8: "8",
                9: "9",
              }}
              queryKey="ratingMin"
              searchParams={searchParams}
              coerceString={asRating}
            />
          </div>
        }
      />
    </main>
  );
}
