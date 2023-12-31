import { updaterBaseURL } from "@/api";
import { getArtist } from "@/app/artists/[volume]/[url]/api";
import { ArtistResult } from "@scruffy/updater";
import SearchResult from "./SearchResult";
import { Suspense } from "react";

type Params = { volume: string; url: string };

const getSpotifyData = async (name: string) => {
  const resp = await fetch(
    `${updaterBaseURL}/spotify/artist/${encodeURIComponent(name)}`,
  );
  const res: ArtistResult[] = await resp.json();

  return res;
};

type Props = {
  params: Params;
  searchValue?: string;
};

const SpotifyInformationAsync = async ({ params, searchValue }: Props) => {
  let name = searchValue;
  if (!name) {
    const artist = await getArtist(params);
    if (artist.status !== "ok") {
      throw "This should never throw";
    }
    name = artist.name;
  }

  const spotifyResults = await getSpotifyData(name);

  return (
    <SearchResult source="Spotify" loading={false} results={spotifyResults} />
  );
};

export default function SpotifyInformation({ params, searchValue }: Props) {
  return (
    <Suspense fallback={<SearchResult loading source="Spotify" />}>
      <SpotifyInformationAsync params={params} searchValue={searchValue} />
    </Suspense>
  );
}
