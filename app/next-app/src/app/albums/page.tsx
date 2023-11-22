import { baseURL } from "@/api";
import { API, AlbumSearchRequest } from "@scruffy/api";
import { RedirectType, redirect } from "next/navigation";
import SearchLayout from "@/components/SearchLayout";
import SortSelect from "@/components/SortSelect";
import { Metadata } from "next";
import AlbumSuspended from "../Components/AlbumSuspended";
import AlbumCard from "@/components/AlbumCard";

export const metadata: Metadata = {
  title: "Search Album Reviews",
  description: "Album reviews by Piero Scaruffi",
};

type Query = Omit<AlbumSearchRequest, "itemsPerPage"> & {
  prevTotal?: number;
  prevDataLength?: number;
};

const getData = async (params: Query) => {
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

  await new Promise<void>((res) => setTimeout(() => res(), 2000));

  return {
    data,
    total,
    params: { ...params, prevTotal: total, prevDataLength: data.length },
  };
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

export default function Albums({ searchParams }: Props) {
  const page = Math.max(parseIntMaybe(searchParams.page) ?? 0, 0);
  const sort = asSortColumn(searchParams.sort);
  const ratingMin = asRating(searchParams.ratingMin);
  const prevTotal = parseIntMaybe(searchParams.prevTotal);
  const prevDataLength = parseIntMaybe(searchParams.prevDataLength);

  return (
    <main className={`flex-1 px-4 min-h-fullscreen`}>
      <SearchLayout
        className="auto-rows-[12.5rem]"
        suspenseKey={JSON.stringify(searchParams)}
        searchName={searchParams.name}
        prevTotal={prevTotal}
        prevDataLength={prevDataLength}
        loadingPlaceholder={<AlbumCard loading />}
        asyncData={getData({
          page,
          sort,
          ratingMin,
          name: searchParams.name,
          prevTotal,
          prevDataLength,
        })}
        page={page ?? 0}
        renderRow={(a) => <AlbumSuspended className="h-48" {...a} />}
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
