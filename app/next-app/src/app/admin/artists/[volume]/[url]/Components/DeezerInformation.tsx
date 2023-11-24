import { updaterBaseURL } from "@/api";
import { getArtist } from "@/app/artists/[volume]/[url]/api";
import { DeezerArtistSearchResult } from "@scruffy/updater";
import SearchResult from "./SearchResult";
import { Suspense } from "react";

type Params = { volume: string; url: string };

const getDeezerData = async (name: string) => {
  const resp = await fetch(
    `${updaterBaseURL}/deezer/artist/${encodeURIComponent(name)}`,
  );
  const res: DeezerArtistSearchResult = await resp.json();

  return res;
};

type Props = {
  params: Params;
  searchValue?: string;
};

const DeezerInformationAsync = async ({ params, searchValue }: Props) => {
  let name = searchValue;
  if (!name) {
    const artist = await getArtist(params);
    if (artist.status !== "ok") {
      throw "This should never throw";
    }
    name = artist.name;
  }

  const deezer = await getDeezerData(name);

  return (
    <SearchResult
      loading={false}
      source="Deezer"
      results={deezer.data.map((a) => ({
        key: a.id,
        name: a.name,
        imageUrl: a.picture_xl,
      }))}
    />
  );
};

export default function DeezerInformation({ params, searchValue }: Props) {
  return (
    <Suspense fallback={<SearchResult loading source="Deezer" />}>
      <DeezerInformationAsync params={params} searchValue={searchValue} />
    </Suspense>
  );
}
