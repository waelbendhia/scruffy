import { API, ArtistSearchRequest } from "@scruffy/api";
import ArtistCard from "@/components/ArtistCard";
import { RedirectType, redirect } from "next/navigation";
import SearchLayout from "@/components/SearchLayout";
import SortSelect from "@/components/SortSelect";
import { baseURL } from "@/api";
import { Metadata } from "next";
import ArtistSuspended from "../Components/ArtistSuspended";
import { getRedisClient } from "@/redis";

export const metadata: Metadata = {
  title: "Search Artist Biographies",
  description: "Artist biographies by Piero Scaruffi",
};

type Query = Omit<ArtistSearchRequest, "itemsPerPage"> & {
  prevTotal?: number;
  prevDataLength?: number;
};

const getData = async (params: Query) => {
  const url = new URL(`${baseURL}/artist`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    url.searchParams.set(key, typeof value === "number" ? `${value}` : value);
  });
  url.searchParams.set("itemsPerPage", "12");
  const resp = await fetch(url, {
    next: { tags: ["artists"], revalidate: 300 },
  });
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

  const client = getRedisClient();
  if (client && data.length > 0) {
    await client.mSet(
      data.map((a): [string, string] => [`artist-name-${a.url}`, a.name]),
    );
  }

  return { data, total };
};

const parseIntMaybe = (s: string | undefined): number | undefined => {
  const parsed = parseInt(s ?? "");
  return isNaN(parsed) ? undefined : parsed;
};

type Props = {
  searchParams: Record<string, string>;
};

export default function Artists({ searchParams }: Props) {
  const page = Math.max(parseIntMaybe(searchParams.page) ?? 0, 0);
  const sort = searchParams.sort === "lastModified" ? "lastModified" : "name";

  return (
    <main className={`flex-1 px-4`}>
      <SearchLayout
        loadingPlaceholder={
          <ArtistCard
            layout="vertical"
            className="h-48"
            imageClassName="h-36"
            loading
          />
        }
        suspenseKey={JSON.stringify(searchParams)}
        searchName={searchParams.name}
        asyncData={getData({
          page,
          sort,
          name: searchParams.name,
        })}
        page={page ?? 0}
        colNumber={4}
        renderRow={(a) => (
          <ArtistSuspended
            layout="vertical"
            key={a.url}
            className="h-48"
            imageClassName="h-36"
            {...a}
          />
        )}
        filters={
          <SortSelect
            labels={{ name: "Name", lastModified: "Last updated" }}
            searchParams={searchParams}
            coerceString={(v) =>
              v === "lastModified" ? "lastModified" : "name"
            }
          />
        }
      />
    </main>
  );
}
