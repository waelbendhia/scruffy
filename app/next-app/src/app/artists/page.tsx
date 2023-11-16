import { API, ArtistSearchRequest } from "@scruffy/server";
import ArtistCard from "@/components/ArtistCard";
import { RedirectType, redirect } from "next/navigation";
import SearchLayout from "@/components/SearchLayout";
import SortSelect from "@/components/SortSelect";
import { baseURL } from "@/api";

const getData = async (params: Omit<ArtistSearchRequest, "itemsPerPage">) => {
  const url = new URL(`${baseURL}/artist`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    url.searchParams.set(key, typeof value === "number" ? `${value}` : value);
  });
  url.searchParams.set("itemsPerPage", "12");
  const resp = await fetch(url, { next: { revalidate: 300 } });
  const { data, total }: API["/artist"]["/"] = await resp.json();

  const maxPage = Math.max(Math.ceil(total / 12) - 1, 0);
  if ((params.page ?? 0) > maxPage) {
    const redirectParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      redirectParams.set(key, typeof val === "number" ? `${val}` : val);
    });
    redirectParams.set("page", `${Math.max(maxPage, 0)}`);
    return redirect(`/artists?${redirectParams}`, RedirectType.replace);
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

export default async function Artists({ searchParams }: Props) {
  const page = Math.max(parseIntMaybe(searchParams.page) ?? 0, 0);
  const sort = searchParams.sort === "lastModified" ? "lastModified" : "name";
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
        colNumber={4}
        renderRow={(a) => (
          <ArtistCard layout="vertical" key={a.url} className="h-48" {...a} />
        )}
        filters={
          <SortSelect
            labels={{ name: "Name", lastModified: "Last updated" }}
            searchParams={searchParams}
            coerceString={(v) => (v === "name" ? "name" : "lastModified")}
          />
        }
      />
    </main>
  );
}
