import { client } from "@/api";
import { API, ArtistSearchRequest } from "@scruffy/server";
import ArtistCard from "@/components/ArtistCard";
import { RedirectType, redirect } from "next/navigation";
import SearchLayout from "@/components/SearchLayout";
import SortSelect from "@/components/SortSelect";

const getData = async (params: Omit<ArtistSearchRequest, "itemsPerPage">) => {
  const { data, total } = await client
    .get<API["/artist"]["/"]>(`/artist`, {
      params: { ...params, itemsPerPage: 12 },
    })
    .then((resp) => resp.data);
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
        data={data}
        total={total}
        page={page ?? 0}
        colNumber={4}
        renderRow={(a) => (
          <ArtistCard layout="vertical" key={a.url} className="h-48" {...a} />
        )}
        filters={
          <SortSelect
            labels={{ name: "Name", lastUpdated: "Last updated" }}
            searchParams={searchParams}
            coerceString={(v) => (v === "name" ? "name" : "lastUpdated")}
          />
        }
      />
    </main>
  );
}
